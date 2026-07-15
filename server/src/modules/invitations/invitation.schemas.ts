import { z } from "zod";

import { USER_ROLES, USER_STATUSES } from "../../config/constants.js";

export const createInvitationSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  expiresAt: z.string().datetime().optional()
});

export const updateUserSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    status: z.enum(USER_STATUSES).optional()
  })
  .refine((value) => value.role !== undefined || value.status !== undefined, {
    message: "At least one field must be provided."
  });
