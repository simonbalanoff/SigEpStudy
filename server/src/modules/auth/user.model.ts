import { Schema, model } from "mongoose";

import { USER_ROLES, USER_STATUSES } from "../../config/constants.js";

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: (typeof USER_ROLES)[number];
  status: (typeof USER_STATUSES)[number];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "member", index: true },
    status: { type: String, enum: USER_STATUSES, default: "active", index: true }
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });

export const User = model<IUser>("User", userSchema);
