import { Schema, model, type Types } from "mongoose";

export interface ISession {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    lastUsedAt: { type: Date, required: true, default: Date.now },
    userAgent: { type: String, maxlength: 500 },
    ipAddress: { type: String, maxlength: 100 }
  },
  { timestamps: true }
);

export const Session = model<ISession>("Session", sessionSchema);
