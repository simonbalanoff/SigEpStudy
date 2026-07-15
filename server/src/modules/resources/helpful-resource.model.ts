import { Schema, model, type Types } from "mongoose";

export interface IHelpfulResource {
  userId: Types.ObjectId;
  resourceId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const helpfulResourceSchema = new Schema<IHelpfulResource>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resourceId: { type: Schema.Types.ObjectId, ref: "Resource", required: true, index: true }
  },
  { timestamps: true }
);

helpfulResourceSchema.index({ userId: 1, resourceId: 1 }, { unique: true });

export const HelpfulResource = model<IHelpfulResource>("HelpfulResource", helpfulResourceSchema);
