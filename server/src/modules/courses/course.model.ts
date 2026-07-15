import { Schema, model } from "mongoose";

export interface ICourse {
    subjectCode: string;
    courseNumber: string;
    displayCode: string;
    title: string;
    description?: string;
    aliases: string[];
    searchText: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
    {
        subjectCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        courseNumber: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        displayCode: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true, maxlength: 240 },
        description: { type: String, trim: true, maxlength: 5000 },
        aliases: { type: [String], default: [] },
        searchText: { type: String, required: true, index: true },
        active: { type: Boolean, default: true, index: true },
    },
    { timestamps: true },
);

courseSchema.index({ subjectCode: 1, courseNumber: 1 }, { unique: true });
courseSchema.index({ active: 1, displayCode: 1 });

export const Course = model<ICourse>("Course", courseSchema);
