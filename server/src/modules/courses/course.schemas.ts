import { z } from "zod";

export const courseSearchSchema = z.object({
    q: z.string().trim().max(120).default(""),
    limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const professorSearchSchema = z.object({
    q: z.string().trim().max(120).default(""),
    courseId: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createProfessorSchema = z
    .object({
        professorId: z.string().optional(),
        displayName: z.string().trim().min(2).max(180).optional(),
        forceCreate: z.boolean().default(false),
    })
    .refine(
        (value) => Boolean(value.professorId) !== Boolean(value.displayName),
        {
            message: "Provide either professorId or displayName.",
        },
    );
