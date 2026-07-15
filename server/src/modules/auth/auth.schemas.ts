import { z } from "zod";

export const registerSchema = z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(254),
    password: z.string().min(10).max(128),
    inviteToken: z.string().min(20).max(500),
});

export const loginSchema = z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
    email: z.string().trim().email().max(254),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(20).max(500),
    newPassword: z.string().min(10).max(128),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(10).max(128),
});

export const updateProfileSchema = z
    .object({
        firstName: z.string().trim().min(1).max(80).optional(),
        lastName: z.string().trim().min(1).max(80).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided.",
    });
