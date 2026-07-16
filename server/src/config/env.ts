import { resolve } from "node:path";

import { z } from "zod";

const schema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().min(1),
    CLIENT_ORIGINS: z
        .string()
        .min(1)
        .transform((value) =>
            value
                .split(",")
                .map((origin) => origin.trim())
                .filter(Boolean),
        ),
    COOKIE_SECRET: z.string().min(32),
    SESSION_DAYS: z.coerce.number().int().positive().default(30),
    MAX_UPLOAD_MB: z.coerce.number().positive().default(25),
    APP_URL: z.string().url(),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
    UPLOAD_DIR: z.string().default("uploads"),
    SMTP_HOST: z.string().optional().default(""),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z
        .string()
        .transform((value) => value === "true")
        .default(false),
    SMTP_USER: z.string().optional().default(""),
    SMTP_PASS: z.string().optional().default(""),
    SMTP_FROM: z.string().min(1),
    SEED_ADMIN_EMAIL: z.string().email().optional(),
    SEED_ADMIN_PASSWORD: z.string().min(10).optional(),
    SEED_ADMIN_FIRST_NAME: z.string().optional(),
    SEED_ADMIN_LAST_NAME: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    throw new Error(z.prettifyError(parsed.error));
}

export const env = {
    ...parsed.data,
    UPLOAD_DIR: resolve(process.cwd(), parsed.data.UPLOAD_DIR),
};
