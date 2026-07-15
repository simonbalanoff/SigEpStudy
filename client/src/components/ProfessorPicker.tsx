import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";

import { queryString, request } from "../lib/api";
import type { Professor } from "../types";
import { Button, Select } from "./ui";

export function ProfessorPicker({
    courseId,
    value,
    onChange,
    onAdd,
}: {
    courseId: string;
    value: Professor | null;
    onChange: (professor: Professor | null) => void;
    onAdd: () => void;
}) {
    const professorsQuery = useQuery({
        queryKey: ["courses", courseId, "professors"],
        queryFn: () =>
            request<{ professors: Professor[] }>(
                `/courses/${courseId}/professors${queryString({})}`,
            ),
        enabled: Boolean(courseId),
    });

    if (value) {
        return (
            <div className="selected-picker-value compact">
                <span>
                    <strong>{value.displayName}</strong>
                    <small>
                        {value.status === "pending"
                            ? "Pending moderator approval"
                            : "Professor"}
                    </small>
                </span>
                <button
                    type="button"
                    className="icon-button"
                    onClick={() => onChange(null)}
                    aria-label="Clear selected professor"
                >
                    <X size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="professor-picker-row">
            <Select
                value=""
                onChange={(event) => {
                    const selected =
                        professorsQuery.data?.professors.find(
                            (professor) => professor._id === event.target.value,
                        ) ?? null;
                    onChange(selected);
                }}
                disabled={professorsQuery.isLoading}
            >
                <option value="">
                    {professorsQuery.isLoading
                        ? "Loading professors…"
                        : "No professor selected"}
                </option>
                {professorsQuery.data?.professors.map((professor) => (
                    <option key={professor._id} value={professor._id}>
                        {professor.displayName}
                    </option>
                ))}
            </Select>
            <Button type="button" variant="secondary" onClick={onAdd}>
                <Plus size={17} />
                Add professor
            </Button>
        </div>
    );
}
