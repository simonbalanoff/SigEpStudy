import { useEffect, useState } from "react";

import { fetchProtectedFile } from "../lib/api";
import { LoadingState } from "./ui";

export function PdfViewer({ resourceId }: { resourceId: string }) {
    const [url, setUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        let localUrl: string | null = null;
        setFailed(false);
        fetchProtectedFile(resourceId, controller.signal)
            .then((nextUrl) => {
                localUrl = nextUrl;
                setUrl(nextUrl);
            })
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === "AbortError"
                )
                    return;
                setFailed(true);
            });
        return () => {
            controller.abort();
            if (localUrl) URL.revokeObjectURL(localUrl);
        };
    }, [resourceId]);

    if (failed)
        return (
            <div className="pdf-fallback">
                The PDF preview could not be loaded.
            </div>
        );
    if (!url) return <LoadingState label="Loading PDF" />;
    return <iframe className="pdf-viewer" src={url} title="PDF preview" />;
}
