import { Schema, model, type Types } from "mongoose";

export interface IAuditEvent {
    actorId: Types.ObjectId;
    action: string;
    targetType: string;
    targetId?: Types.ObjectId;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const auditEventSchema = new Schema<IAuditEvent>(
    {
        actorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        action: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
            index: true,
        },
        targetType: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        targetId: { type: Schema.Types.ObjectId },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true },
);

auditEventSchema.index({ createdAt: -1 });

export const AuditEvent = model<IAuditEvent>("AuditEvent", auditEventSchema);
