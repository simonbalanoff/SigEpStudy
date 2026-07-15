import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { originGuard } from "./middleware/origin-guard.js";
import { apiRouter } from "./routes/index.js";
import { isAllowedOrigin } from "./config/cors.js";

export const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet());
app.use(
    cors({
        origin(origin, callback) {
            if (isAllowedOrigin(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error("Origin is not allowed by CORS."));
        },
        credentials: true,
    }),
);
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 500,
        standardHeaders: true,
        legacyHeaders: false,
    }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser(env.COOKIE_SECRET));
app.use(originGuard);

app.use("/api/v1", apiRouter);

app.use(notFound);
app.use(errorHandler);
