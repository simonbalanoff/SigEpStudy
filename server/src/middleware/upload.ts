import multer from "multer";

import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export const uploadPdf = multer({
    storage: multer.memoryStorage(),
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
