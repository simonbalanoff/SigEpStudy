import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  FilePlus2,
  Search
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ResourceCard } from "../components/ResourceCard";
import { Button, LoadingState } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { queryString, request } from "../lib/api";
import type { PaginatedResources, Resource } from "../types";

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const recentQuery = useQuery({
    queryKey: ["resources", "recent"],
    queryFn: () =>
      request<PaginatedResources>(
        `/resources${queryString({
          sort: "newest",
          limit: 6
        })}`
      )
  });

  const mineQuery = useQuery({
    queryKey: ["resources", "mine"],
    queryFn: () =>
      request<{ resources: Resource[] }>("/resources/mine")
  });

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = search.trim();

    navigate(
      query
        ? `/library?q=${encodeURIComponent(query)}`
        : "/library"
    );
  };

  const pending =
    mineQuery.data?.resources
      .filter(
        (resource) =>
          resource.status === "pending" ||
          resource.status === "changes_requested"
      )
      .slice(0, 3) ?? [];

  const recentResources = recentQuery.data?.resources ?? [];

  return (
    <div className="page home-page">
      <section className="home-hero">
        <div>
          <span className="eyebrow">
            Colorado Gamma Study Bank
          </span>

          <h1>
            Hey {user?.firstName}, what are you studying?
          </h1>

          <p>
            Find chapter-shared notes, study guides, practice
            problems, and more.
          </p>
        </div>

        <form className="hero-search" onSubmit={submitSearch}>
          <Search size={21} />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search courses or resources"
            aria-label="Search study bank"
          />

          <Button type="submit">Search</Button>
        </form>
      </section>

      <section
        className="quick-actions"
        aria-label="Quick actions"
      >
        <Link to="/library" className="quick-action-card">
          <span className="quick-action-icon purple">
            <BookOpen size={23} />
          </span>

          <span>
            <strong>Browse library</strong>
            <small>See all approved resources</small>
          </span>

          <ArrowRight size={19} />
        </Link>

        <Link to="/submit" className="quick-action-card">
          <span className="quick-action-icon red">
            <FilePlus2 size={23} />
          </span>

          <span>
            <strong>Share a resource</strong>
            <small>Submit notes or a study guide</small>
          </span>

          <ArrowRight size={19} />
        </Link>

        <Link to="/saved" className="quick-action-card">
          <span className="quick-action-icon gold">
            <Bookmark size={23} />
          </span>

          <span>
            <strong>Saved resources</strong>
            <small>Return to things you bookmarked</small>
          </span>

          <ArrowRight size={19} />
        </Link>
      </section>

      <section className="home-grid">
        <article className="home-panel">
          <header className="home-panel-header">
            <div>
              <h2>Recently added</h2>
              <p>
                New resources approved by the moderation team.
              </p>
            </div>

            <Link
              className="home-panel-link"
              to="/library"
            >
              View all
            </Link>
          </header>

          <div className="home-panel-content">
            {recentQuery.isLoading ? (
              <LoadingState label="Loading resources" />
            ) : recentResources.length > 0 ? (
              <div className="resource-list">
                {recentResources.map((resource) => (
                  <ResourceCard
                    key={resource._id}
                    resource={resource}
                    compact
                  />
                ))}
              </div>
            ) : (
              <div className="home-panel-empty">
                <span className="home-panel-empty-icon">
                  <BookOpen size={24} />
                </span>

                <div>
                  <h3>No resources yet</h3>
                  <p>
                    Approved resources will appear here.
                  </p>
                </div>

                <Link
                  className="button button-secondary button-sm"
                  to="/submit"
                >
                  Submit a resource
                </Link>
              </div>
            )}
          </div>
        </article>

        <article className="home-panel">
          <header className="home-panel-header">
            <div>
              <h2>Your submissions</h2>
              <p>
                Track anything currently being reviewed.
              </p>
            </div>

            <Link
              className="home-panel-link"
              to="/submissions"
            >
              See all
            </Link>
          </header>

          <div className="home-panel-content">
            {mineQuery.isLoading ? (
              <LoadingState label="Loading submissions" />
            ) : pending.length > 0 ? (
              <div className="submission-mini-list">
                {pending.map((resource) => (
                  <Link
                    to={`/resources/${resource._id}`}
                    key={resource._id}
                  >
                    <span>{resource.title}</span>

                    <small>
                      {resource.status.replaceAll("_", " ")}
                    </small>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="home-panel-empty">
                <span className="home-panel-empty-icon">
                  <FilePlus2 size={24} />
                </span>

                <div>
                  <h3>Nothing waiting for review</h3>
                  <p>
                    Your pending submissions will appear here.
                  </p>
                </div>

                <Link
                  className="button button-secondary button-sm"
                  to="/submit"
                >
                  Submit a resource
                </Link>
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}