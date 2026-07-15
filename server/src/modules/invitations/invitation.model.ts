import { Schema, model, type Types } from "mongoose";

export interface IInvitation {
    tokenHash: string;
    label?: string;
    active: boolean;
    expiresAt?: Date;
    createdBy: Types.ObjectId;
    useCount: number;
    lastUsedAt?: Date;
    lastUsedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
    {
        tokenHash: {
            type: String,
            required: true,
            unique: true,
        },
        label: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        active: {
            type: Boolean,
            default: true,
            index: true,
        },
        expiresAt: {
            type: Date,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        useCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastUsedAt: {
            type: Date,
        },
        lastUsedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    },
);

invitationSchema.index({
    active: 1,
    createdAt: -1,
});

export const Invitation = model<IInvitation>("Invitation", invitationSchema);
