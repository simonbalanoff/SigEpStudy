import type { RequestHandler } from "express";

import { Invitation } from "../invitations/invitation.model.js";
import { AppError } from "../../utils/app-error.js";
import { createToken, hashToken } from "../../utils/crypto.js";
import { normalizeEmail } from "../../utils/normalize.js";
import { sendPasswordResetEmail } from "../../services/mail.js";
import { PasswordResetToken } from "./password-reset-token.model.js";
import { Session } from "./session.model.js";
import { User } from "./user.model.js";
import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    updateProfileSchema,
} from "./auth.schemas.js";
import {
    clearSessionCookie,
    createSession,
    hashPassword,
    serializeUser,
    setSessionCookie,
    verifyPassword,
} from "./auth.service.js";

export const register: RequestHandler = async (request, response) => {
    const input = registerSchema.parse(request.body);
    const email = normalizeEmail(input.email);
    const now = new Date();

    const existingUser = await User.exists({ email });

    if (existingUser) {
        throw new AppError(
            409,
            "EMAIL_IN_USE",
            "An account already exists for that email address.",
        );
    }

    const invitation = await Invitation.findOne({
        tokenHash: hashToken(input.inviteToken),
        active: true,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: now } },
        ],
    });

    if (!invitation) {
        throw new AppError(
            404,
            "INVITATION_INVALID",
            "This invitation link is invalid, expired, or deactivated.",
        );
    }

    const user = await User.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        passwordHash: await hashPassword(input.password),
        role: "member",
        status: "active",
    });

    await Invitation.updateOne(
        { _id: invitation._id },
        {
            $inc: {
                useCount: 1,
            },
            $set: {
                lastUsedAt: new Date(),
                lastUsedBy: user._id,
            },
        },
    );

    const token = await createSession(user._id, request);

    setSessionCookie(response, token);

    response.status(201).json({
        user: serializeUser(user),
        sessionToken:
            request.get("x-client-type") === "native" ? token : undefined,
    });
};

export const login: RequestHandler = async (request, response) => {
    const input = loginSchema.parse(request.body);
    const user = await User.findOne({
        email: normalizeEmail(input.email),
    }).select("+passwordHash");
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new AppError(
            401,
            "INVALID_CREDENTIALS",
            "The email or password is incorrect.",
        );
    }
    if (user.status !== "active")
        throw new AppError(
            403,
            "ACCOUNT_SUSPENDED",
            "This account is suspended.",
        );
    const token = await createSession(user._id, request);
    setSessionCookie(response, token);
    response.json({
        user: serializeUser(user),
        sessionToken:
            request.get("x-client-type") === "native" ? token : undefined,
    });
};

export const logout: RequestHandler = async (request, response) => {
    if (request.auth)
        await Session.deleteOne({ _id: request.auth.session._id });
    clearSessionCookie(response);
    response.status(204).send();
};

export const logoutAll: RequestHandler = async (request, response) => {
    const user = request.auth?.user;
    if (!user)
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    await Session.deleteMany({ userId: user._id });
    clearSessionCookie(response);
    response.status(204).send();
};

export const getCurrentUser: RequestHandler = async (request, response) => {
    const user = request.auth?.user;
    if (!user)
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    response.json({ user: serializeUser(user) });
};

export const forgotPassword: RequestHandler = async (request, response) => {
    const input = forgotPasswordSchema.parse(request.body);
    const user = await User.findOne({
        email: normalizeEmail(input.email),
        status: "active",
    });
    if (user) {
        await PasswordResetToken.deleteMany({ userId: user._id });
        const token = createToken();
        await PasswordResetToken.create({
            userId: user._id,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
        await sendPasswordResetEmail(user.email, token);
    }
    response.status(202).json({
        message: "If the account exists, a reset link has been sent.",
    });
};

export const resetPassword: RequestHandler = async (request, response) => {
    const input = resetPasswordSchema.parse(request.body);
    const resetToken = await PasswordResetToken.findOne({
        tokenHash: hashToken(input.token),
        expiresAt: { $gt: new Date() },
    });
    if (!resetToken)
        throw new AppError(
            400,
            "INVALID_RESET_TOKEN",
            "The reset token is invalid or expired.",
        );
    const user = await User.findById(resetToken.userId).select("+passwordHash");
    if (!user)
        throw new AppError(
            400,
            "INVALID_RESET_TOKEN",
            "The reset token is invalid or expired.",
        );
    user.passwordHash = await hashPassword(input.newPassword);
    await user.save();
    await Promise.all([
        PasswordResetToken.deleteMany({ userId: user._id }),
        Session.deleteMany({ userId: user._id }),
    ]);
    clearSessionCookie(response);
    response.json({ message: "Your password has been reset." });
};

export const changePassword: RequestHandler = async (request, response) => {
    const input = changePasswordSchema.parse(request.body);
    const authUser = request.auth?.user;
    if (!authUser)
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    const user = await User.findById(authUser._id).select("+passwordHash");
    if (
        !user ||
        !(await verifyPassword(input.currentPassword, user.passwordHash))
    ) {
        throw new AppError(
            400,
            "INVALID_CURRENT_PASSWORD",
            "The current password is incorrect.",
        );
    }
    user.passwordHash = await hashPassword(input.newPassword);
    await user.save();
    await Session.deleteMany({
        userId: user._id,
        _id: { $ne: request.auth?.session._id },
    });
    response.json({ message: "Your password has been changed." });
};

export const updateProfile: RequestHandler = async (request, response) => {
    const user = request.auth?.user;
    if (!user)
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    const input = updateProfileSchema.parse(request.body);
    if (input.firstName !== undefined) user.firstName = input.firstName;
    if (input.lastName !== undefined) user.lastName = input.lastName;
    await user.save();
    response.json({ user: serializeUser(user) });
};
