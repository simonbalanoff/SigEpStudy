import { env } from "./env.js";

const allowedOrigins = new Set(env.CLIENT_ORIGINS);

export function isAllowedOrigin(origin: string | undefined): boolean {
    if (!origin) {
        return true;
    }

    return allowedOrigins.has(origin);
}