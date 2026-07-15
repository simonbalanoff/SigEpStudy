import { Schema, model, type Types } from "mongoose";

import { RESOURCE_STATUSES, RESOURCE_TYPES } from "../../config/constants.js";

export interface IResource {
    courseId: Types.ObjectId;
    professorId?: Types.ObjectId;
    uploaderId: Types.ObjectId;
    title: string;
    description: string;
    resourceType: (typeof RESOURCE_TYPES)[number];
    topics: string[];
    normalizedTopics: string[];
    searchText: string;
    storageKind: "file" | "external";
    originalFileName?: string;
    storedFileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    externalUrl?: string;
    status: (typeof RESOURCE_STATUSES)[number];
    moderationNote?: string;
    moderatedBy?: Types.ObjectId;
    moderatedAt?: Date;
    publishedAt?: Date;
    helpfulCount: number;
    previewFileName?: string;
    createdAt: Date;
    updatedAt: Date;
}

const resourceSchema = new Schema<IResource>(
    {
        courseId: {
            type: Schema.Types.ObjectId,
            ref: "Course",
            required: true,
            index: true,
        },
        professorId: {
            type: Schema.Types.ObjectId,
            ref: "Professor",
            index: true,
        },
        uploaderId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        title: { type: String, required: true, trim: true, maxlength: 240 },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000,
        },
        resourceType: {
            type: String,
            enum: RESOURCE_TYPES,
            required: true,
            index: true,
        },
        topics: { type: [String], default: [] },
        normalizedTopics: { type: [String], default: [], index: true },
        searchText: { type: String, required: true, index: true },
        storageKind: {
            type: String,
            enum: ["file", "external"],
            required: true,
        },
        originalFileName: { type: String, maxlength: 500 },
        storedFileName: { type: String, maxlength: 500 },
        previewFileName: {
            type: String,
            maxlength: 500,
        },
        mimeType: { type: String, maxlength: 200 },
        sizeBytes: { type: Number, min: 0 },
        externalUrl: { type: String, maxlength: 2000 },
        status: {
            type: String,
            enum: RESOURCE_STATUSES,
            default: "pending",
            index: true,
        },
        moderationNote: { type: String, maxlength: 2000 },
        moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
        moderatedAt: { type: Date },
        publishedAt: { type: Date },
        helpfulCount: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true },
);

resourceSchema.index({ courseId: 1, status: 1, publishedAt: -1 });
resourceSchema.index({ professorId: 1, status: 1 });
resourceSchema.index({ uploaderId: 1, status: 1, createdAt: -1 });

export const Resource = model<IResource>("Resource", resourceSchema);
