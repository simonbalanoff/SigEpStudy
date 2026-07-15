import type { RequestHandler } from "express";

import type { USER_ROLES } from "../config/constants.js";
import { AppError } from "../utils/app-error.js";

type Role = (typeof USER_ROLES)[number];

export function authorize(...roles: Role[]): RequestHandler {
  return (request, _response, next) => {
    const user = request.auth?.user;

    if (!user) {
      throw new AppError(401, "AUTHENTICATION_REQUIRED", "You must sign in to continue.");
    }

    if (!roles.includes(user.role)) {
      throw new AppError(403, "INSUFFICIENT_PERMISSION", "You do not have permission to perform this action.");
    }

    next();
  };
}
