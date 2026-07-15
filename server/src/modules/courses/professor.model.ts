import { Schema, model, type Types } from "mongoose";

import { PROFESSOR_STATUSES } from "../../config/constants.js";

export interface IProfessor {
    displayName: string;
    normalizedName: string;
    aliases: string[];
    status: (typeof PROFESSOR_STATUSES)[number];
    createdBy: Types.ObjectId;
    approvedBy?: Types.ObjectId;
    mergedIntoProfessorId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const professorSchema = new Schema<IProfessor>(
    {
        displayName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
        },
        normalizedName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        aliases: { type: [String], default: [] },
        status: {
            type: String,
            enum: PROFESSOR_STATUSES,
            default: "pending",
            index: true,
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
        mergedIntoProfessorId: {
            type: Schema.Types.ObjectId,
            ref: "Professor",
        },
    },
    { timestamps: true },
);

professorSchema.index({ normalizedName: 1, status: 1 });

export const Professor = model<IProfessor>("Professor", professorSchema);
