import { useQuery } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { Link } from "react-router-dom";

import { ResourceCard } from "../components/ResourceCard";
import { EmptyState, LoadingState, PageHeader } from "../components/ui";
import { request } from "../lib/api";
import type { Resource } from "../types";

export function SavedPage() {
    const savedQuery = useQuery({
        queryKey: ["resources", "saved"],
        queryFn: () => request<{ resources: Resource[] }>("/resources/saved"),
    });

    return (
        <div className="page">
            <PageHeader
                title="Saved"
                description="Resources you bookmarked for later."
            />
            {savedQuery.isLoading ? (
                <LoadingState label="Loading saved resources" />
            ) : null}
            {!savedQuery.isLoading &&
            savedQuery.data?.resources.length === 0 ? (
                <EmptyState
                    icon={<Bookmark size={28} />}
                    title="Nothing saved yet"
                    description="Save useful resources from the library and they will appear here."
                    action={
                        <Link
                            className="button button-primary button-md"
                            to="/library"
                        >
                            Browse the library
                        </Link>
                    }
                />
            ) : null}
            {savedQuery.data?.resources.length ? (
                <div className="resource-grid">
                    {savedQuery.data.resources.map((resource) => (
                        <ResourceCard key={resource._id} resource={resource} />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
