import type { RequestHandler } from "express";

import { AppError } from "../utils/app-error.js";

export const notFound: RequestHandler = (request, _response, next) => {
    next(
        new AppError(
            404,
            "ROUTE_NOT_FOUND",
            `No route exists for ${request.method} ${request.originalUrl}.`,
        ),
    );
};
