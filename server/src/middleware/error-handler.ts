import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";

import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

type MongoError = Error & {
  code?: number;
  keyValue?: Record<string, unknown>;
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request data is invalid.",
        details: error.flatten()
      }
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    response.status(400).json({
      error: {
        code: "UPLOAD_ERROR",
        message: error.message
      }
    });
    return;
  }

  const mongoError = error as MongoError;

  if (mongoError.code === 11000) {
    response.status(409).json({
      error: {
        code: "DUPLICATE_VALUE",
        message: "A record with that value already exists.",
        details: mongoError.keyValue
      }
    });
    return;
  }

  if (env.NODE_ENV !== "production") {
    console.error(error);
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred."
    }
  });
};
