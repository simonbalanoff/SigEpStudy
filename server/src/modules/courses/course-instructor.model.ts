import { Schema, model, type Types } from "mongoose";

export interface ICourseInstructor {
    courseId: Types.ObjectId;
    professorId: Types.ObjectId;
    status: "pending" | "approved" | "rejected";
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const courseInstructorSchema = new Schema<ICourseInstructor>(
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
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true,
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true },
);

courseInstructorSchema.index({ courseId: 1, professorId: 1 }, { unique: true });

export const CourseInstructor = model<ICourseInstructor>(
    "CourseInstructor",
    courseInstructorSchema,
);
