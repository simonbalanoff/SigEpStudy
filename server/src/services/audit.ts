import type { Types } from "mongoose";

import { AuditEvent } from "../modules/moderation/audit-event.model.js";

export async function recordAuditEvent(input: {
    actorId: Types.ObjectId;
    action: string;
    targetType: string;
    targetId?: Types.ObjectId;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    await AuditEvent.create(input);
}
