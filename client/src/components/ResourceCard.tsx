import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, ExternalLink, FileText, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { apiUrl, request } from "../lib/api";
import { RESOURCE_TYPE_LABELS } from "../lib/constants";
import { formatDate, getCourse, getProfessor } from "../lib/format";
import type { Resource } from "../types";
import { cx, StatusBadge } from "./ui";

export function ResourceCard({
    resource,
    showStatus = false,
    compact = false,
}: {
    resource: Resource;
    showStatus?: boolean;
    compact?: boolean;
}) {
    const queryClient = useQueryClient();
    const course = getCourse(resource);
    const professor = getProfessor(resource);

    const [isSaved, setIsSaved] = useState(resource.isSaved ?? false);
    const [previewFailed, setPreviewFailed] = useState(false);

    useEffect(() => {
        setIsSaved(resource.isSaved ?? false);
    }, [resource.isSaved]);

    useEffect(() => {
        setPreviewFailed(false);
    }, [resource._id]);

    const saveMutation = useMutation({
        mutationFn: (nextSaved: boolean) =>
            request<void>(`/resources/${resource._id}/save`, {
                method: nextSaved ? "POST" : "DELETE",
            }),
        onMutate: (nextSaved) => {
            setIsSaved(nextSaved);
        },
        onError: (_error, nextSaved) => {
            setIsSaved(!nextSaved);
            toast.error("Could not update your saved resources.");
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ["resources"],
                }),
                queryClient.invalidateQueries({
                    queryKey: ["saved"],
                }),
                queryClient.invalidateQueries({
                    queryKey: ["resource", resource._id],
                }),
            ]);
        },
    });

    const showPreview =
        !compact && resource.storageKind === "file" && !previewFailed;

    return (
        <article
            className={cx(
                "resource-card",
                compact && "compact",
                showPreview && "has-preview",
            )}
        >
            <Link
                className="resource-card-link"
                to={`/resources/${resource._id}`}
            >
                {showPreview ? (
                    <div className="resource-card-preview">
                        <img
                            src={apiUrl(`/resources/${resource._id}/preview`)}
                            alt={`Preview of ${resource.title}`}
                            loading="lazy"
                            onError={() => {
                                setPreviewFailed(true);
                            }}
                        />

                        <span className="resource-preview-badge">
                            <FileText size={13} />
                            PDF
                        </span>
                    </div>
                ) : null}

                <div className="resource-card-main">
                    <div className="resource-card-icon">
                        {resource.storageKind === "external" ? (
                            <ExternalLink size={21} />
                        ) : (
                            <FileText size={21} />
                        )}
                    </div>

                    <div className="resource-card-body">
                        <div className="resource-card-topline">
                            <span className="course-pill">
                                {course?.displayCode || "Course"}
                            </span>

                            {showStatus ? (
                                <StatusBadge status={resource.status} />
                            ) : null}
                        </div>

                        <h3>{resource.title}</h3>

                        {!compact ? <p>{resource.description}</p> : null}

                        <div className="resource-card-meta">
                            <span>
                                {RESOURCE_TYPE_LABELS[resource.resourceType]}
                            </span>

                            {professor ? (
                                <span>{professor.displayName}</span>
                            ) : null}

                            <span>
                                {formatDate(
                                    resource.publishedAt || resource.createdAt,
                                )}
                            </span>
                        </div>

                        {!compact && resource.topics.length > 0 ? (
                            <div className="topic-row">
                                {resource.topics.slice(0, 3).map((topic) => (
                                    <span key={topic}>{topic}</span>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>
            </Link>

            <div className="resource-card-aside">
                <button
                    type="button"
                    className={cx("resource-save-button", isSaved && "saved")}
                    disabled={saveMutation.isPending}
                    aria-label={
                        isSaved
                            ? "Remove from saved resources"
                            : "Save resource"
                    }
                    aria-pressed={isSaved}
                    onClick={() => {
                        saveMutation.mutate(!isSaved);
                    }}
                >
                    <Bookmark
                        size={18}
                        fill={isSaved ? "currentColor" : "none"}
                    />
                </button>

                {resource.helpfulCount > 0 ? (
                    <span className="resource-helpful-count">
                        <ThumbsUp size={15} />
                        {resource.helpfulCount}
                    </span>
                ) : null}
            </div>
        </article>
    );
}
