import { Schema, model, type Types } from "mongoose";

export interface ISavedResource {
    userId: Types.ObjectId;
    resourceId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const savedResourceSchema = new Schema<ISavedResource>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        resourceId: {
            type: Schema.Types.ObjectId,
            ref: "Resource",
            required: true,
            index: true,
        },
    },
    { timestamps: true },
);

savedResourceSchema.index({ userId: 1, resourceId: 1 }, { unique: true });

export const SavedResource = model<ISavedResource>(
    "SavedResource",
    savedResourceSchema,
);
