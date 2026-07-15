import type { RequestHandler } from "express";

import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const originGuard: RequestHandler = (request, _response, next) => {
  if (SAFE_METHODS.has(request.method)) {
    next();
    return;
  }

  const hasSessionCookie = Boolean(request.signedCookies.session);

  if (!hasSessionCookie) {
    next();
    return;
  }

  const origin = request.get("origin");

  if (origin !== env.CLIENT_ORIGIN) {
    throw new AppError(403, "INVALID_ORIGIN", "The request origin is not allowed.");
  }

  next();
};
