import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { pdf } from "pdf-to-img";

export async function generatePdfPreview(pdfBuffer: Buffer): Promise<Buffer> {
    const temporaryDirectory = await mkdtemp(
        join(tmpdir(), "sigep-study-preview-"),
    );
    const temporaryPdf = join(temporaryDirectory, "document.pdf");

    try {
        await writeFile(temporaryPdf, pdfBuffer);

        const document = await pdf(temporaryPdf, {
            scale: 1.5,
        });

        try {
            const firstPage = await document.getPage(1);
            return Buffer.from(firstPage);
        } finally {
            await document.destroy();
        }
    } finally {
        await rm(temporaryDirectory, {
            recursive: true,
            force: true,
        });
    }
}
