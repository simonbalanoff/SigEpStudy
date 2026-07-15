import { useQuery } from "@tanstack/react-query";
import { Filter, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { CoursePicker } from "../components/CoursePicker";
import { ResourceCard } from "../components/ResourceCard";
import { Button, Card, EmptyState, LoadingState, PageHeader, PaginationControls, Select } from "../components/ui";
import { queryString, request } from "../lib/api";
import { RESOURCE_TYPES } from "../lib/constants";
import { useDebouncedValue } from "../lib/use-debounced-value";
import type { Course, PaginatedResources, Professor, ResourceType } from "../types";

export function LibraryPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [course, setCourse] = useState<Course | null>(null);
  const [professorId, setProfessorId] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType | "">("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => setPage(1), [debouncedQuery, course, professorId, resourceType, sort]);
  useEffect(() => setProfessorId(""), [course?._id]);

  const professorsQuery = useQuery({
    queryKey: ["courses", course?._id, "professors"],
    queryFn: () => request<{ professors: Professor[] }>(`/courses/${course!._id}/professors`),
    enabled: Boolean(course)
  });

  const resourcesQuery = useQuery({
    queryKey: ["resources", "library", debouncedQuery, course?._id, professorId, resourceType, sort, page],
    queryFn: () => request<PaginatedResources>(`/resources${queryString({
      q: debouncedQuery,
      courseId: course?._id,
      professorId,
      resourceType,
      sort,
      page,
      limit: 18
    })}`)
  });

  const clearFilters = () => {
    setCourse(null);
    setProfessorId("");
    setResourceType("");
    setSort("newest");
  };

  const hasFilters = Boolean(course || professorId || resourceType || sort !== "newest");

  return (
    <div className="page">
      <PageHeader title="Library" description="Search all approved Colorado Gamma study resources." />

      <Card className="library-controls">
        <div className="library-search">
          <Search size={20} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, topics, or course names" aria-label="Search resources" />
        </div>
        <Button className="mobile-filter-button" variant="secondary" onClick={() => setShowFilters((value) => !value)}>
          <SlidersHorizontal size={18} /> Filters
        </Button>
        <div className={`library-filters ${showFilters ? "open" : ""}`}>
          <div className="filter-course"><CoursePicker value={course} onChange={setCourse} placeholder="Filter by course" /></div>
          <Select value={professorId} onChange={(event) => setProfessorId(event.target.value)} disabled={!course} aria-label="Filter by professor">
            <option value="">All professors</option>
            {professorsQuery.data?.professors.map((professor) => <option key={professor._id} value={professor._id}>{professor.displayName}</option>)}
          </Select>
          <Select value={resourceType} onChange={(event) => setResourceType(event.target.value as ResourceType | "")} aria-label="Filter by resource type">
            <option value="">All resource types</option>
            {RESOURCE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort resources">
            <option value="newest">Newest first</option>
            <option value="helpful">Most helpful</option>
            <option value="oldest">Oldest first</option>
          </Select>
          {hasFilters ? <Button variant="ghost" onClick={clearFilters}>Clear</Button> : null}
        </div>
      </Card>

      <div className="results-heading">
        <span><Filter size={16} /> {resourcesQuery.data?.pagination.total ?? 0} resources</span>
      </div>

      {resourcesQuery.isLoading ? <LoadingState label="Loading library" /> : null}
      {!resourcesQuery.isLoading && resourcesQuery.data?.resources.length === 0 ? (
        <EmptyState icon={<Search size={28} />} title="No resources found" description="Try a different search or clear your filters." />
      ) : null}
      {resourcesQuery.data?.resources.length ? (
        <div className="resource-grid">{resourcesQuery.data.resources.map((resource) => <ResourceCard key={resource._id} resource={resource} />)}</div>
      ) : null}
      <PaginationControls page={page} pages={resourcesQuery.data?.pagination.pages ?? 1} onChange={setPage} />
    </div>
  );
}
