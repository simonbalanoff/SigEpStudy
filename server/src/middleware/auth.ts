import type { RequestHandler } from "express";

import { Session } from "../modules/auth/session.model.js";
import { User } from "../modules/auth/user.model.js";
import { AppError } from "../utils/app-error.js";
import { hashToken } from "../utils/crypto.js";

export const requireAuth: RequestHandler = async (request, _response, next) => {
    const authorization = request.get("authorization");
    const bearerToken = authorization?.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : undefined;
    const cookieToken = request.signedCookies.session as string | undefined;
    const token = bearerToken ?? cookieToken;
    const tokenSource = bearerToken ? "bearer" : "cookie";

    if (!token) {
        throw new AppError(
            401,
            "AUTHENTICATION_REQUIRED",
            "You must sign in to continue.",
        );
    }

    const session = await Session.findOne({
        tokenHash: hashToken(token),
        expiresAt: { $gt: new Date() },
    });

    if (!session) {
        throw new AppError(
            401,
            "INVALID_SESSION",
            "Your session is invalid or expired.",
        );
    }

    const user = await User.findById(session.userId);

    if (!user || user.status !== "active") {
        await Session.deleteOne({ _id: session._id });
        throw new AppError(
            403,
            "ACCOUNT_UNAVAILABLE",
            "This account is unavailable.",
        );
    }

    session.lastUsedAt = new Date();
    await session.save();

    request.auth = { user, session, tokenSource };
    next();
};
