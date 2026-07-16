import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { Resource } from "../modules/resources/resource.model.js";
import { deleteObjects, uploadObject } from "../services/object-storage.js";
import { generatePdfPreview } from "../services/pdf-preview.js";

async function fileExists(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

async function migrate(): Promise<void> {
    await connectDatabase();

    const resources = await Resource.find({
        storageKind: "file",
        $or: [
            { fileObjectKey: { $exists: false } },
            { fileObjectKey: null },
            { previewObjectKey: { $exists: false } },
            { previewObjectKey: null },
        ],
    }).select(
        "+fileObjectKey +previewObjectKey +storedFileName +previewFileName",
    );

    console.log(`Found ${resources.length} local file resources to inspect.`);

    let migrated = 0;
    let skipped = 0;

    for (const resource of resources) {
        if (!resource.storedFileName) {
            console.warn(`Skipping ${resource._id}: no storedFileName.`);
            skipped += 1;
            continue;
        }

        const pdfPath = join(env.UPLOAD_DIR, resource.storedFileName);

        if (!(await fileExists(pdfPath))) {
            console.warn(`Skipping ${resource._id}: missing ${pdfPath}.`);
            skipped += 1;
            continue;
        }

        const pdfBuffer = await readFile(pdfPath);
        const previewPath = resource.previewFileName
            ? join(env.UPLOAD_DIR, resource.previewFileName)
            : undefined;
        const previewBuffer =
            previewPath && (await fileExists(previewPath))
                ? await readFile(previewPath)
                : await generatePdfPreview(pdfBuffer);

        const objectDirectory = `resources/${resource._id}`;
        const fileObjectKey = `${objectDirectory}/document.pdf`;
        const previewObjectKey = `${objectDirectory}/preview.png`;
        const uploadedKeys = [fileObjectKey, previewObjectKey];

        try {
            await Promise.all([
                uploadObject({
                    key: fileObjectKey,
                    body: pdfBuffer,
                    contentType: resource.mimeType ?? "application/pdf",
                }),
                uploadObject({
                    key: previewObjectKey,
                    body: previewBuffer,
                    contentType: "image/png",
                }),
            ]);

            await Resource.updateOne(
                { _id: resource._id },
                {
                    $set: {
                        fileObjectKey,
                        previewObjectKey,
                    },
                },
            );

            migrated += 1;
            console.log(`Migrated ${resource._id}.`);
        } catch (error) {
            await deleteObjects(uploadedKeys).catch(() => undefined);
            throw error;
        }
    }

    console.log(`Migration complete. Migrated ${migrated}; skipped ${skipped}.`);
}

migrate()
    .catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await disconnectDatabase();
    });
