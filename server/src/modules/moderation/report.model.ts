import { Schema, model, type Types } from "mongoose";

import { REPORT_REASONS, REPORT_STATUSES } from "../../config/constants.js";

export interface IReport {
    resourceId: Types.ObjectId;
    reporterId: Types.ObjectId;
    reason: (typeof REPORT_REASONS)[number];
    description?: string;
    status: (typeof REPORT_STATUSES)[number];
    resolvedBy?: Types.ObjectId;
    resolutionNote?: string;
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
    {
        resourceId: {
            type: Schema.Types.ObjectId,
            ref: "Resource",
            required: true,
            index: true,
        },
        reporterId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        reason: { type: String, enum: REPORT_REASONS, required: true },
        description: { type: String, trim: true, maxlength: 2000 },
        status: {
            type: String,
            enum: REPORT_STATUSES,
            default: "open",
            index: true,
        },
        resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
        resolutionNote: { type: String, trim: true, maxlength: 2000 },
        resolvedAt: { type: Date },
    },
    { timestamps: true },
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporterId: 1, resourceId: 1, status: 1 });

export const Report = model<IReport>("Report", reportSchema);
