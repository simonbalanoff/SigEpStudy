import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Bookmark,
    Download,
    ExternalLink,
    Flag,
    Pencil,
    ThumbsUp,
    Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PdfViewer } from "../components/PdfViewer";
import {
    Button,
    Card,
    Field,
    LoadingState,
    Modal,
    PageHeader,
    Select,
    StatusBadge,
    Textarea,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ApiError, downloadProtectedFile, request } from "../lib/api";
import {
    REPORT_REASONS,
    REPORT_REASON_LABELS,
    RESOURCE_STATUS_LABELS,
    RESOURCE_TYPE_LABELS,
} from "../lib/constants";
import { formatBytes, formatDate, fullName, getId } from "../lib/format";
import type { ReportReason, ResourceDetailResponse } from "../types";

export function ResourcePage() {
    const { resourceId = "" } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] =
        useState<ReportReason>("incorrect_course");
    const [reportDescription, setReportDescription] = useState("");
    const [reportError, setReportError] = useState("");

    const detailQuery = useQuery({
        queryKey: ["resources", resourceId],
        queryFn: () =>
            request<ResourceDetailResponse>(`/resources/${resourceId}`),
        enabled: Boolean(resourceId),
    });

    const saveMutation = useMutation({
        mutationFn: (saved: boolean) =>
            request<void>(`/resources/${resourceId}/save`, {
                method: saved ? "DELETE" : "POST",
            }),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ["resources", resourceId],
                }),
                queryClient.invalidateQueries({
                    queryKey: ["resources", "saved"],
                }),
            ]);
        },
    });

    const helpfulMutation = useMutation({
        mutationFn: (marked: boolean) =>
            request<{ helpfulCount: number; markedHelpful: boolean }>(
                `/resources/${resourceId}/helpful`,
                { method: marked ? "DELETE" : "POST" },
            ),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["resources", resourceId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["resources", "library"],
            });
        },
    });

    const reportMutation = useMutation({
        mutationFn: () =>
            request("/reports", {
                method: "POST",
                body: JSON.stringify({
                    resourceId,
                    reason: reportReason,
                    description: reportDescription.trim() || undefined,
                }),
            }),
    });

    const deleteMutation = useMutation({
        mutationFn: () =>
            request<void>(`/resources/${resourceId}`, { method: "DELETE" }),
    });

    if (detailQuery.isLoading)
        return (
            <div className="page">
                <LoadingState label="Loading resource" />
            </div>
        );
    if (detailQuery.isError || !detailQuery.data) {
        return (
            <div className="page">
                <PageHeader
                    title="Resource unavailable"
                    description="It may have been removed or you may not have permission to view it."
                />
            </div>
        );
    }

    const { resource, course, professor, saved, markedHelpful } =
        detailQuery.data;
    const uploaderId = getId(resource.uploaderId);
    const currentUserId = getId(user);
    const isOwner = uploaderId === currentUserId;
    const canEdit =
        isOwner &&
        ["pending", "changes_requested", "rejected"].includes(resource.status);
    const canDelete =
        canEdit || user?.role === "moderator" || user?.role === "admin";

    const sendReport = async () => {
        setReportError("");
        try {
            await reportMutation.mutateAsync();
            toast.success("Report sent to the moderation team.");
            setReportOpen(false);
            setReportDescription("");
        } catch (error) {
            setReportError(
                error instanceof ApiError
                    ? error.message
                    : "The report could not be sent.",
            );
        }
    };

    const deleteResource = async () => {
        if (!window.confirm("Delete this resource? This cannot be undone."))
            return;
        try {
            await deleteMutation.mutateAsync();
            await queryClient.invalidateQueries({ queryKey: ["resources"] });
            toast.success("Resource deleted.");
            navigate(isOwner ? "/submissions" : "/library", { replace: true });
        } catch (error) {
            toast.error(
                error instanceof ApiError
                    ? error.message
                    : "The resource could not be deleted.",
            );
        }
    };

    return (
        <div className="page resource-detail-page">
            <div className="resource-detail-header">
                <div>
                    <div className="resource-detail-labels">
                        <span className="course-pill">
                            {course?.displayCode || "Course"}
                        </span>
                        {resource.status !== "approved" ? (
                            <StatusBadge status={resource.status} />
                        ) : null}
                    </div>
                    <h1>{resource.title}</h1>
                    <p>
                        {RESOURCE_TYPE_LABELS[resource.resourceType]}
                        {professor ? ` · ${professor.displayName}` : ""}
                    </p>
                </div>
                <div className="resource-actions">
                    {resource.status === "approved" ? (
                        <>
                            <Button
                                variant={saved ? "primary" : "secondary"}
                                onClick={() => saveMutation.mutate(saved)}
                                loading={saveMutation.isPending}
                            >
                                <Bookmark
                                    size={18}
                                    fill={saved ? "currentColor" : "none"}
                                />{" "}
                                {saved ? "Saved" : "Save"}
                            </Button>
                            <Button
                                variant={
                                    markedHelpful ? "primary" : "secondary"
                                }
                                onClick={() =>
                                    helpfulMutation.mutate(markedHelpful)
                                }
                                loading={helpfulMutation.isPending}
                            >
                                <ThumbsUp
                                    size={18}
                                    fill={
                                        markedHelpful ? "currentColor" : "none"
                                    }
                                />{" "}
                                Helpful {resource.helpfulCount || ""}
                            </Button>
                        </>
                    ) : null}
                    {canEdit ? (
                        <Link
                            className="button button-secondary button-md"
                            to={`/submissions/${resource._id}/edit`}
                        >
                            <Pencil size={18} /> Edit
                        </Link>
                    ) : null}
                </div>
            </div>

            {resource.status !== "approved" ? (
                <div className={`moderation-banner status-${resource.status}`}>
                    <strong>{RESOURCE_STATUS_LABELS[resource.status]}</strong>
                    <span>
                        {resource.moderationNote ||
                            "This resource is only visible to you and the moderation team."}
                    </span>
                </div>
            ) : null}

            <div className="resource-detail-layout">
                <section className="resource-content-panel">
                    {resource.storageKind === "file" ? (
                        <PdfViewer resourceId={resource._id} />
                    ) : (
                        <Card className="external-resource-card">
                            <ExternalLink size={34} />
                            <h2>External resource</h2>
                            <p>
                                This submission links to a resource hosted
                                elsewhere.
                            </p>
                            <a
                                className="button button-primary button-lg"
                                href={resource.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open resource <ExternalLink size={18} />
                            </a>
                        </Card>
                    )}
                </section>

                <aside className="resource-info-panel">
                    <Card>
                        <h2>About this resource</h2>
                        <p className="resource-description">
                            {resource.description}
                        </p>
                        <dl className="detail-list">
                            <div>
                                <dt>Course</dt>
                                <dd>
                                    {course
                                        ? `${course.displayCode} · ${course.title}`
                                        : "—"}
                                </dd>
                            </div>
                            <div>
                                <dt>Professor</dt>
                                <dd>
                                    {professor?.displayName || "Not specified"}
                                </dd>
                            </div>
                            <div>
                                <dt>Submitted by</dt>
                                <dd>{fullName(resource.uploaderId)}</dd>
                            </div>
                            <div>
                                <dt>Added</dt>
                                <dd>
                                    {formatDate(
                                        resource.publishedAt ||
                                            resource.createdAt,
                                    )}
                                </dd>
                            </div>
                            {resource.sizeBytes ? (
                                <div>
                                    <dt>File size</dt>
                                    <dd>{formatBytes(resource.sizeBytes)}</dd>
                                </div>
                            ) : null}
                        </dl>
                        {resource.topics.length ? (
                            <div className="topic-row">
                                {resource.topics.map((topic) => (
                                    <span key={topic}>{topic}</span>
                                ))}
                            </div>
                        ) : null}
                    </Card>

                    {resource.storageKind === "file" ? (
                        <Button
                            variant="secondary"
                            className="full-width"
                            onClick={() =>
                                void downloadProtectedFile(
                                    resource._id,
                                    resource.originalFileName || "resource.pdf",
                                )
                            }
                        >
                            <Download size={18} /> Download PDF
                        </Button>
                    ) : null}
                    {resource.status === "approved" ? (
                        <Button
                            variant="ghost"
                            className="full-width"
                            onClick={() => setReportOpen(true)}
                        >
                            <Flag size={17} /> Report a problem
                        </Button>
                    ) : null}
                    {canDelete ? (
                        <Button
                            variant="danger"
                            className="full-width"
                            loading={deleteMutation.isPending}
                            onClick={() => void deleteResource()}
                        >
                            <Trash2 size={17} /> Delete resource
                        </Button>
                    ) : null}
                </aside>
            </div>

            <Modal
                open={reportOpen}
                onClose={() => setReportOpen(false)}
                title="Report this resource"
                description="Reports are reviewed by chapter moderators."
            >
                <div className="form-stack">
                    <Field label="Reason">
                        <Select
                            value={reportReason}
                            onChange={(event) =>
                                setReportReason(
                                    event.target.value as ReportReason,
                                )
                            }
                        >
                            {REPORT_REASONS.map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Details" hint="Optional, but helpful.">
                        <Textarea
                            rows={4}
                            value={reportDescription}
                            onChange={(event) =>
                                setReportDescription(event.target.value)
                            }
                            placeholder={`Explain the ${REPORT_REASON_LABELS[reportReason].toLowerCase()} concern.`}
                        />
                    </Field>
                    {reportError ? (
                        <div className="form-alert error">{reportError}</div>
                    ) : null}
                    <div className="modal-actions">
                        <Button
                            variant="ghost"
                            onClick={() => setReportOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            loading={reportMutation.isPending}
                            onClick={() => void sendReport()}
                        >
                            Send report
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
