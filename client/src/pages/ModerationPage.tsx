import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileCheck2, Flag, Merge, UserCheck, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button, Card, EmptyState, Field, Input, LoadingState, Modal, PageHeader, PaginationControls, Select, StatusBadge, Textarea } from "../components/ui";
import { ApiError, queryString, request } from "../lib/api";
import { REPORT_REASON_LABELS, RESOURCE_TYPE_LABELS } from "../lib/constants";
import { formatDateTime, fullName, getCourse, getProfessor } from "../lib/format";
import { useDebouncedValue } from "../lib/use-debounced-value";
import type { Pagination, Professor, ProfessorStatus, Report, ReportStatus, Resource, ResourceStatus } from "../types";

type ModerationTab = "resources" | "professors" | "reports";

export function ModerationPage() {
  const [tab, setTab] = useState<ModerationTab>("resources");

  return (
    <div className="page">
      <PageHeader title="Moderation center" description="Review submitted materials, professor names, and member reports." />
      <div className="tab-bar" role="tablist">
        <button className={tab === "resources" ? "active" : ""} onClick={() => setTab("resources")}><FileCheck2 size={18} /> Resource queue</button>
        <button className={tab === "professors" ? "active" : ""} onClick={() => setTab("professors")}><UserCheck size={18} /> Professor queue</button>
        <button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}><Flag size={18} /> Reports</button>
      </div>
      {tab === "resources" ? <ResourceQueue /> : null}
      {tab === "professors" ? <ProfessorQueue /> : null}
      {tab === "reports" ? <ReportsQueue /> : null}
    </div>
  );
}

function ResourceQueue() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ResourceStatus>("pending");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [action, setAction] = useState<"request_changes" | "reject" | "remove">("request_changes");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const resourcesQuery = useQuery({
    queryKey: ["moderation", "resources", status, page],
    queryFn: () => request<{ resources: Resource[]; pagination: Pagination }>(`/moderation/resources${queryString({ status, page, limit: 20 })}`)
  });

  const mutation = useMutation({
    mutationFn: ({ id, action: nextAction, note: nextNote }: { id: string; action: "approve" | "request_changes" | "reject" | "remove"; note?: string }) =>
      request<{ resource: Resource }>(`/moderation/resources/${id}`, { method: "PATCH", body: JSON.stringify({ action: nextAction, note: nextNote }) })
  });

  const moderate = async (resource: Resource, nextAction: "approve" | "request_changes" | "reject" | "remove", nextNote?: string) => {
    try {
      await mutation.mutateAsync({ id: resource._id, action: nextAction, note: nextNote });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["moderation", "resources"] }),
        queryClient.invalidateQueries({ queryKey: ["resources"] })
      ]);
      toast.success(nextAction === "approve" ? "Resource published." : "Moderation decision saved.");
      setSelected(null);
      setNote("");
      setError("");
    } catch (nextError) {
      const message = nextError instanceof ApiError ? nextError.message : "The resource could not be updated.";
      if (selected) setError(message); else toast.error(message);
    }
  };

  return (
    <section className="admin-panel">
      <div className="panel-toolbar">
        <div><h2>Resource queue</h2><p>Review materials before they appear in the library.</p></div>
        <Select value={status} onChange={(event) => { setStatus(event.target.value as ResourceStatus); setPage(1); }}>
          <option value="pending">Pending</option>
          <option value="changes_requested">Changes requested</option>
          <option value="rejected">Rejected</option>
          <option value="approved">Published</option>
          <option value="removed">Removed</option>
        </Select>
      </div>

      {resourcesQuery.isLoading ? <LoadingState label="Loading resource queue" /> : null}
      {!resourcesQuery.isLoading && resourcesQuery.data?.resources.length === 0 ? <EmptyState icon={<FileCheck2 size={28} />} title="Queue is clear" description={`There are no ${status.replaceAll("_", " ")} resources.`} /> : null}
      <div className="moderation-list">
        {resourcesQuery.data?.resources.map((resource) => {
          const course = getCourse(resource);
          const professor = getProfessor(resource);
          return (
            <Card className="moderation-item" key={resource._id}>
              <div className="moderation-item-main">
                <div className="moderation-item-labels"><span className="course-pill">{course?.displayCode || "Course"}</span><StatusBadge status={resource.status} /></div>
                <h3>{resource.title}</h3>
                <p>{resource.description}</p>
                <div className="resource-card-meta"><span>{RESOURCE_TYPE_LABELS[resource.resourceType]}</span>{professor ? <span>{professor.displayName}</span> : null}<span>By {fullName(resource.uploaderId)}</span><span>{formatDateTime(resource.createdAt)}</span></div>
              </div>
              <div className="moderation-item-actions">
                <Link className="button button-secondary button-sm" to={`/resources/${resource._id}`}>Review resource</Link>
                {resource.status !== "approved" ? <Button size="sm" loading={mutation.isPending} onClick={() => void moderate(resource, "approve")}><Check size={16} /> Approve</Button> : null}
                {resource.status === "pending" || resource.status === "approved" ? (
                  <Button size="sm" variant="ghost" onClick={() => { setSelected(resource); setAction(resource.status === "approved" ? "remove" : "request_changes"); setNote(""); setError(""); }}>
                    More actions
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
      <PaginationControls page={page} pages={resourcesQuery.data?.pagination.pages ?? 1} onChange={setPage} />

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Moderate resource" description={selected?.title}>
        <div className="form-stack">
          <Field label="Action">
            <Select value={action} onChange={(event) => setAction(event.target.value as typeof action)}>
              {selected?.status !== "approved" ? <option value="request_changes">Request changes</option> : null}
              {selected?.status !== "approved" ? <option value="reject">Reject</option> : null}
              {selected?.status === "approved" ? <option value="remove">Remove from library</option> : null}
            </Select>
          </Field>
          <Field label="Message to contributor" required><Textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain the decision clearly." /></Field>
          {error ? <div className="form-alert error">{error}</div> : null}
          <div className="modal-actions"><Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button><Button variant={action === "request_changes" ? "primary" : "danger"} loading={mutation.isPending} onClick={() => selected && void moderate(selected, action, note)}>Save decision</Button></div>
        </div>
      </Modal>
    </section>
  );
}

function ProfessorQueue() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ProfessorStatus>("pending");
  const [page, setPage] = useState(1);
  const [mergeProfessor, setMergeProfessor] = useState<Professor | null>(null);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeTarget, setMergeTarget] = useState<Professor | null>(null);
  const debouncedSearch = useDebouncedValue(mergeSearch, 250);

  const professorsQuery = useQuery({
    queryKey: ["moderation", "professors", status, page],
    queryFn: () => request<{ professors: Professor[]; pagination: Pagination }>(`/moderation/professors${queryString({ status, page, limit: 20 })}`)
  });
  const searchQuery = useQuery({
    queryKey: ["professors", "search", debouncedSearch],
    queryFn: () => request<{ professors: Professor[] }>(`/professors/search${queryString({ q: debouncedSearch, limit: 20 })}`),
    enabled: Boolean(mergeProfessor && debouncedSearch)
  });
  const mutation = useMutation({
    mutationFn: ({ id, action, mergeIntoProfessorId }: { id: string; action: "approve" | "reject" | "merge"; mergeIntoProfessorId?: string }) =>
      request<{ professor: Professor }>(`/moderation/professors/${id}`, { method: "PATCH", body: JSON.stringify({ action, mergeIntoProfessorId }) })
  });

  const moderate = async (professor: Professor, action: "approve" | "reject" | "merge", targetId?: string) => {
    try {
      await mutation.mutateAsync({ id: professor._id, action, mergeIntoProfessorId: targetId });
      await queryClient.invalidateQueries({ queryKey: ["moderation", "professors"] });
      toast.success(action === "approve" ? "Professor approved." : action === "merge" ? "Professor records merged." : "Professor rejected.");
      setMergeProfessor(null);
      setMergeTarget(null);
      setMergeSearch("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "The professor could not be updated.");
    }
  };

  return (
    <section className="admin-panel">
      <div className="panel-toolbar">
        <div><h2>Professor queue</h2><p>Keep professor names consistent and free of duplicates.</p></div>
        <Select value={status} onChange={(event) => { setStatus(event.target.value as ProfessorStatus); setPage(1); }}>
          <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="merged">Merged</option>
        </Select>
      </div>
      {professorsQuery.isLoading ? <LoadingState label="Loading professor queue" /> : null}
      {!professorsQuery.isLoading && professorsQuery.data?.professors.length === 0 ? <EmptyState icon={<UserCheck size={28} />} title="Queue is clear" description={`There are no ${status} professor records.`} /> : null}
      <div className="moderation-list">
        {professorsQuery.data?.professors.map((professor) => (
          <Card className="moderation-item professor-item" key={professor._id}>
            <div className="moderation-item-main"><div className="moderation-item-labels"><StatusBadge status={professor.status} /></div><h3>{professor.displayName}</h3><p>Added by {fullName(professor.createdBy)} · {formatDateTime(professor.createdAt)}</p></div>
            {professor.status === "pending" ? <div className="moderation-item-actions"><Button size="sm" loading={mutation.isPending} onClick={() => void moderate(professor, "approve")}><Check size={16} /> Approve</Button><Button size="sm" variant="secondary" onClick={() => { setMergeProfessor(professor); setMergeTarget(null); setMergeSearch(""); }}><Merge size={16} /> Merge</Button><Button size="sm" variant="danger" loading={mutation.isPending} onClick={() => void moderate(professor, "reject")}><X size={16} /> Reject</Button></div> : null}
          </Card>
        ))}
      </div>
      <PaginationControls page={page} pages={professorsQuery.data?.pagination.pages ?? 1} onChange={setPage} />

      <Modal open={Boolean(mergeProfessor)} onClose={() => setMergeProfessor(null)} title="Merge professor" description={`Merge ${mergeProfessor?.displayName} into an approved professor record.`}>
        <div className="form-stack">
          <Field label="Find approved professor"><Input value={mergeSearch} onChange={(event) => setMergeSearch(event.target.value)} placeholder="Search by name" /></Field>
          <div className="merge-results">
            {searchQuery.data?.professors.filter((professor) => professor._id !== mergeProfessor?._id).map((professor) => (
              <button key={professor._id} className={mergeTarget?._id === professor._id ? "selected" : ""} onClick={() => setMergeTarget(professor)}><span>{professor.displayName}</span>{mergeTarget?._id === professor._id ? <Check size={17} /> : null}</button>
            ))}
          </div>
          <div className="modal-actions"><Button variant="ghost" onClick={() => setMergeProfessor(null)}>Cancel</Button><Button disabled={!mergeTarget} loading={mutation.isPending} onClick={() => mergeProfessor && mergeTarget && void moderate(mergeProfessor, "merge", mergeTarget._id)}>Merge records</Button></div>
        </div>
      </Modal>
    </section>
  );
}

function ReportsQueue() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatus>("open");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Report | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<"resolved" | "dismissed">("resolved");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const reportsQuery = useQuery({
    queryKey: ["moderation", "reports", status, page],
    queryFn: () => request<{ reports: Report[]; pagination: Pagination }>(`/moderation/reports${queryString({ status, page, limit: 20 })}`)
  });
  const mutation = useMutation({
    mutationFn: ({ id, status: nextStatus, resolutionNote }: { id: string; status: "resolved" | "dismissed"; resolutionNote: string }) =>
      request<{ report: Report }>(`/moderation/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus, resolutionNote }) })
  });

  const resolve = async () => {
    if (!selected) return;
    setError("");
    if (!note.trim()) {
      setError("Add a resolution note.");
      return;
    }
    try {
      await mutation.mutateAsync({ id: selected._id, status: resolutionStatus, resolutionNote: note.trim() });
      await queryClient.invalidateQueries({ queryKey: ["moderation", "reports"] });
      toast.success("Report updated.");
      setSelected(null);
      setNote("");
    } catch (nextError) {
      setError(nextError instanceof ApiError ? nextError.message : "The report could not be updated.");
    }
  };

  return (
    <section className="admin-panel">
      <div className="panel-toolbar">
        <div><h2>Reports</h2><p>Review concerns submitted by chapter members.</p></div>
        <Select value={status} onChange={(event) => { setStatus(event.target.value as ReportStatus); setPage(1); }}><option value="open">Open</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></Select>
      </div>
      {reportsQuery.isLoading ? <LoadingState label="Loading reports" /> : null}
      {!reportsQuery.isLoading && reportsQuery.data?.reports.length === 0 ? <EmptyState icon={<Flag size={28} />} title="No reports" description={`There are no ${status} reports.`} /> : null}
      <div className="moderation-list">
        {reportsQuery.data?.reports.map((report) => {
          const resource = typeof report.resourceId === "string" ? null : report.resourceId;
          return (
            <Card className="moderation-item" key={report._id}>
              <div className="moderation-item-main"><div className="moderation-item-labels"><StatusBadge status={report.status} /></div><h3>{REPORT_REASON_LABELS[report.reason]}</h3><p>{report.description || "No additional details were provided."}</p><div className="resource-card-meta"><span>Reported by {fullName(report.reporterId)}</span><span>{formatDateTime(report.createdAt)}</span></div>{report.resolutionNote ? <div className="resolution-note"><strong>Resolution:</strong> {report.resolutionNote}</div> : null}</div>
              <div className="moderation-item-actions">{resource ? <Link className="button button-secondary button-sm" to={`/resources/${resource._id}`}>{resource.title}</Link> : null}{report.status === "open" ? <Button size="sm" onClick={() => { setSelected(report); setResolutionStatus("resolved"); setNote(""); setError(""); }}>Resolve</Button> : null}</div>
            </Card>
          );
        })}
      </div>
      <PaginationControls page={page} pages={reportsQuery.data?.pagination.pages ?? 1} onChange={setPage} />

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Resolve report" description={selected ? REPORT_REASON_LABELS[selected.reason] : undefined}>
        <div className="form-stack">
          <Field label="Outcome"><Select value={resolutionStatus} onChange={(event) => setResolutionStatus(event.target.value as "resolved" | "dismissed")}><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></Select></Field>
          <Field label="Resolution note" required><Textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record what was reviewed and what action was taken." /></Field>
          {error ? <div className="form-alert error">{error}</div> : null}
          <div className="modal-actions"><Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button><Button loading={mutation.isPending} onClick={() => void resolve()}>Save resolution</Button></div>
        </div>
      </Modal>
    </section>
  );
}
