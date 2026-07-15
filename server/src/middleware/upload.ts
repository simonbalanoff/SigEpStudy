import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { extname } from "node:path";

import multer from "multer";

import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

mkdirSync(env.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: env.UPLOAD_DIR,
    filename: (_request, file, callback) => {
        const extension = extname(file.originalname).toLowerCase() || ".pdf";
        callback(null, `${randomUUID()}${extension}`);
    },
});

export const uploadPdf = multer({
    storage,
    limits: {
        fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
        files: 1,
    },
    fileFilter: (_request, file, callback) => {
        if (file.mimetype !== "application/pdf") {
            callback(
                new AppError(
                    400,
                    "INVALID_FILE_TYPE",
                    "Only PDF files are accepted.",
                ),
            );
            return;
        }
        callback(null, true);
    },
});
