import { z } from "zod";

import { REPORT_REASONS, REPORT_STATUSES, RESOURCE_STATUSES } from "../../config/constants.js";

export const createReportSchema = z.object({
  resourceId: z.string(),
  reason: z.enum(REPORT_REASONS),
  description: z.string().trim().max(2000).optional()
});

export const moderateResourceSchema = z.object({
  action: z.enum(["approve", "request_changes", "reject", "remove"]),
  note: z.string().trim().max(2000).optional()
});

export const moderationResourceQuerySchema = z.object({
  status: z.enum(RESOURCE_STATUSES).default("pending"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const professorModerationSchema = z.object({
  action: z.enum(["approve", "reject", "merge"]),
  displayName: z.string().trim().min(2).max(180).optional(),
  mergeIntoProfessorId: z.string().optional()
});

export const professorModerationQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "merged"]).default("pending"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const reportQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).default("open"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const resolveReportSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
  resolutionNote: z.string().trim().min(1).max(2000)
});
