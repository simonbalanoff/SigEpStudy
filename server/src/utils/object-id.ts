import mongoose from "mongoose";

import { AppError } from "./app-error.js";

export function requireObjectId(
    value: string,
    field = "id",
): mongoose.Types.ObjectId {
    if (!mongoose.isValidObjectId(value)) {
        throw new AppError(400, "INVALID_ID", `${field} is invalid.`);
    }
    return new mongoose.Types.ObjectId(value);
}
