import { resolve } from "node:path";

import { z } from "zod";

const schema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().min(1),
    CLIENT_ORIGIN: z.string().url(),
    COOKIE_SECRET: z.string().min(32),
    SESSION_DAYS: z.coerce.number().int().positive().default(30),
    UPLOAD_DIR: z.string().default("uploads"),
    MAX_UPLOAD_MB: z.coerce.number().positive().default(25),
    APP_URL: z.string().url(),
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
