import { z } from "zod";

import { RESOURCE_TYPES } from "../../config/constants.js";

function parseTopics(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return value.split(",").map((item) => item.trim());
  }
  return [];
}

export const createResourceSchema = z.object({
  courseId: z.string(),
  professorId: z.string().optional().transform((value) => value || undefined),
  title: z.string().trim().min(3).max(240),
  description: z.string().trim().min(10).max(5000),
  resourceType: z.enum(RESOURCE_TYPES),
  topics: z.preprocess(parseTopics, z.array(z.string().trim().min(1).max(80)).max(20)).default([]),
  externalUrl: z.string().url().max(2000).optional().transform((value) => value || undefined)
});

export const updateResourceSchema = z.object({
  professorId: z.string().nullable().optional(),
  title: z.string().trim().min(3).max(240).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  resourceType: z.enum(RESOURCE_TYPES).optional(),
  topics: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  externalUrl: z.string().url().max(2000).nullable().optional()
}).refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided." });

export const listResourcesSchema = z.object({
  q: z.string().trim().max(120).default(""),
  courseId: z.string().optional(),
  professorId: z.string().optional(),
  resourceType: z.enum(RESOURCE_TYPES).optional(),
  topic: z.string().trim().max(80).optional(),
  sort: z.enum(["newest", "oldest", "helpful"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
