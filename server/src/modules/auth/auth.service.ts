import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import type { Types } from "mongoose";

import { env } from "../../config/env.js";
import { createToken, hashToken } from "../../utils/crypto.js";
import type { IUser } from "./user.model.js";
import { Session } from "./session.model.js";

export function serializeUser(
    user: IUser & { _id: unknown },
): Record<string, unknown> {
    return {
        id: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(
    password: string,
    hash: string,
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function createSession(
    userId: Types.ObjectId,
    request: Request,
): Promise<string> {
    const token = createToken();
    const expiresAt = new Date(
        Date.now() + env.SESSION_DAYS * 24 * 60 * 60 * 1000,
    );

    await Session.create({
        userId,
        tokenHash: hashToken(token),
        expiresAt,
        lastUsedAt: new Date(),
        userAgent: request.get("user-agent"),
        ipAddress: request.ip,
    });

    return token;
}

export function setSessionCookie(response: Response, token: string): void {
    response.cookie("session", token, {
        signed: true,
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: env.SESSION_DAYS * 24 * 60 * 60 * 1000,
        path: "/",
    });
}

export function clearSessionCookie(response: Response): void {
    response.clearCookie("session", {
        signed: true,
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    });
}
