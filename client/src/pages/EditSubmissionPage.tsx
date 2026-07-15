import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button, Card, Field, Input, LoadingState, PageHeader, Select, Textarea } from "../components/ui";
import { ApiError, request } from "../lib/api";
import { RESOURCE_TYPES } from "../lib/constants";
import type { Resource, ResourceDetailResponse, ResourceType } from "../types";

export function EditSubmissionPage() {
  const { resourceId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ["resources", resourceId],
    queryFn: () => request<ResourceDetailResponse>(`/resources/${resourceId}`),
    enabled: Boolean(resourceId)
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("study_guide");
  const [topics, setTopics] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const resource = detailQuery.data?.resource;
    if (!resource) return;
    setTitle(resource.title);
    setDescription(resource.description);
    setResourceType(resource.resourceType);
    setTopics(resource.topics.join(", "));
    setExternalUrl(resource.externalUrl || "");
  }, [detailQuery.data]);

  const mutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => request<{ resource: Resource }>(`/resources/${resourceId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    })
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await mutation.mutateAsync({
        title,
        description,
        resourceType,
        topics: topics.split(",").map((topic) => topic.trim()).filter(Boolean),
        ...(resourceType === "external_link" ? { externalUrl } : {})
      });
      await queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Submission updated and returned to the review queue.");
      navigate(`/resources/${resourceId}`);
    } catch (nextError) {
      setError(nextError instanceof ApiError ? nextError.message : "The submission could not be updated.");
    }
  };

  if (detailQuery.isLoading) return <div className="page"><LoadingState label="Loading submission" /></div>;
  if (!detailQuery.data) return <div className="page"><PageHeader title="Submission unavailable" /></div>;

  return (
    <div className="page narrow-page">
      <PageHeader title="Edit submission" description="Your changes will return the resource to the moderation queue." />
      <Card className="form-card">
        <form className="submission-form" onSubmit={submit}>
          <Field label="Title" required><Input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} /></Field>
          <Field label="Resource type" required>
            <Select value={resourceType} onChange={(event) => setResourceType(event.target.value as ResourceType)}>
              {RESOURCE_TYPES.filter(([value]) => (detailQuery.data.resource.storageKind === "external") === (value === "external_link")).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Description" required><Textarea rows={6} value={description} onChange={(event) => setDescription(event.target.value)} required minLength={10} /></Field>
          <Field label="Topics" hint="Separate topics with commas."><Input value={topics} onChange={(event) => setTopics(event.target.value)} /></Field>
          {detailQuery.data.resource.storageKind === "external" ? <Field label="Resource link" required><Input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} required /></Field> : null}
          {error ? <div className="form-alert error">{error}</div> : null}
          <div className="form-actions"><Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button><Button type="submit" loading={mutation.isPending}>Save changes</Button></div>
        </form>
      </Card>
    </div>
  );
}
