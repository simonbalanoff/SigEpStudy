import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";

import { request, queryString } from "../lib/api";
import { useDebouncedValue } from "../lib/use-debounced-value";
import type { Course } from "../types";
import { Input, LoadingState } from "./ui";

export function CoursePicker({
  value,
  onChange,
  placeholder = "Search by course code or name"
}: {
  value: Course | null;
  onChange: (course: Course | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query, 250);
  const rootRef = useRef<HTMLDivElement>(null);

  const coursesQuery = useQuery({
    queryKey: ["courses", "search", debounced],
    queryFn: () => request<{ courses: Course[] }>(`/courses/search${queryString({ q: debounced, limit: 30 })}`),
    enabled: open
  });

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (value) {
    return (
      <div className="selected-picker-value">
        <span>
          <strong>{value.displayCode}</strong>
          <small>{value.title}</small>
        </span>
        <button type="button" className="icon-button" onClick={() => onChange(null)} aria-label="Clear selected course">
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="picker" ref={rootRef}>
      <Search className="picker-search-icon" size={18} />
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open ? (
        <div className="picker-menu">
          {coursesQuery.isLoading ? <LoadingState label="Finding courses" /> : null}
          {!coursesQuery.isLoading && coursesQuery.data?.courses.length === 0 ? (
            <div className="picker-empty">No courses found.</div>
          ) : null}
          {coursesQuery.data?.courses.map((course) => (
            <button
              type="button"
              key={course._id}
              className="picker-option"
              onClick={() => {
                onChange(course);
                setQuery("");
                setOpen(false);
              }}
            >
              <span>
                <strong>{course.displayCode}</strong>
                <small>{course.title}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
