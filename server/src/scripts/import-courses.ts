import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Course } from "../modules/courses/course.model.js";
import { normalizeSearch } from "../utils/normalize.js";

const courseSchema = z.object({
    subjectCode: z.string().trim().min(1).max(20),
    courseNumber: z.string().trim().min(1).max(30),
    title: z.string().trim().min(2).max(240),
    description: z.string().trim().max(5000).optional(),
    aliases: z.array(z.string().trim().min(1).max(240)).max(20).default([]),
    active: z.boolean().default(true),
});

const inputSchema = z.array(courseSchema).min(1);

async function run(): Promise<void> {
    const inputPath = process.argv[2];
    if (!inputPath)
        throw new Error("Usage: npm run import:courses -- data/courses.json");

    const filePath = resolve(process.cwd(), inputPath);
    const raw = await readFile(filePath, "utf8");
    const courses = inputSchema.parse(JSON.parse(raw) as unknown);

    await connectDatabase();

    const operations = courses.map((course) => {
        const subjectCode = course.subjectCode.toUpperCase();
        const courseNumber = course.courseNumber.toUpperCase();
        const displayCode = `${subjectCode} ${courseNumber}`;
        const searchText = normalizeSearch(
            [
                displayCode,
                `${subjectCode}${courseNumber}`,
                course.title,
                course.description ?? "",
                ...course.aliases,
            ].join(" "),
        );

        return {
            updateOne: {
                filter: { subjectCode, courseNumber },
                update: {
                    $set: {
                        subjectCode,
                        courseNumber,
                        displayCode,
                        title: course.title,
                        description: course.description,
                        aliases: course.aliases,
                        searchText,
                        active: course.active,
                    },
                },
                upsert: true,
            },
        };
    });

    const result = await Course.bulkWrite(operations, { ordered: false });
    console.log(`Imported ${courses.length} courses.`);
    console.log(
        `Created ${result.upsertedCount}; updated ${result.modifiedCount}; matched ${result.matchedCount}.`,
    );
}

run()
    .catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await disconnectDatabase();
    });
