import { useQuery } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import { Link } from "react-router-dom";

import { ResourceCard } from "../components/ResourceCard";
import { Button, EmptyState, LoadingState, PageHeader } from "../components/ui";
import { request } from "../lib/api";
import type { Resource } from "../types";

export function SubmissionsPage() {
  const query = useQuery({
    queryKey: ["resources", "mine"],
    queryFn: () => request<{ resources: Resource[] }>("/resources/mine")
  });

  return (
    <div className="page">
      <PageHeader
        title="Your submissions"
        description="Track resources you have shared and make changes when requested."
        action={<Link to="/submit"><Button><FilePlus2 size={18} /> New submission</Button></Link>}
      />
      {query.isLoading ? <LoadingState label="Loading submissions" /> : null}
      {!query.isLoading && query.data?.resources.length === 0 ? (
        <EmptyState icon={<FilePlus2 size={28} />} title="No submissions yet" description="Share a useful resource with the chapter." action={<Link className="button button-primary button-md" to="/submit">Submit a resource</Link>} />
      ) : null}
      {query.data?.resources.length ? <div className="resource-grid">{query.data.resources.map((resource) => <ResourceCard key={resource._id} resource={resource} showStatus />)}</div> : null}
    </div>
  );
}
