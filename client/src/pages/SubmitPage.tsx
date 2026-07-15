import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Link2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { CoursePicker } from "../components/CoursePicker";
import { ProfessorPicker } from "../components/ProfessorPicker";
import {
    Button,
    Card,
    Field,
    Input,
    Modal,
    PageHeader,
    Select,
    Textarea,
} from "../components/ui";
import { ApiError, request } from "../lib/api";
import { RESOURCE_TYPES } from "../lib/constants";
import type { Course, Professor, Resource } from "../types";

const schema = z.object({
    title: z.string().trim().min(3, "Enter a clear title."),
    description: z.string().trim().min(10, "Add a short description."),
    resourceType: z.enum([
        "study_guide",
        "class_notes",
        "practice_problems",
        "formula_sheet",
        "flashcards",
        "project_guide",
        "external_link",
        "other",
    ]),
    topics: z.string(),
    externalUrl: z.string(),
    rightsConfirmed: z.literal(true, {
        message: "Confirm that you are allowed to share this resource.",
    }),
});

type Values = z.infer<typeof schema>;

export function SubmitPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [course, setCourse] = useState<Course | null>(null);
    const [professor, setProfessor] = useState<Professor | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [addProfessorOpen, setAddProfessorOpen] = useState(false);
    const [professorName, setProfessorName] = useState("");
    const [professorError, setProfessorError] = useState("");

    const form = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: "",
            description: "",
            resourceType: "study_guide",
            topics: "",
            externalUrl: "",
            rightsConfirmed: false as true,
        },
    });

    const selectedType = useWatch({
        control: form.control,
        name: "resourceType",
    });
    const isExternal = selectedType === "external_link";

    const createMutation = useMutation({
        mutationFn: (data: FormData) =>
            request<{ resource: Resource }>("/resources", {
                method: "POST",
                body: data,
            }),
    });

    const addProfessorMutation = useMutation({
        mutationFn: (displayName: string) =>
            request<{ professor: Professor }>(
                `/courses/${course!._id}/professors`,
                {
                    method: "POST",
                    body: JSON.stringify({ displayName }),
                },
            ),
        onSuccess: ({ professor: createdProfessor }) => {
            setProfessor(createdProfessor);

            queryClient.setQueryData<{ professors: Professor[] }>(
                ["courses", course!._id, "professors"],
                (current) => {
                    const professors = current?.professors ?? [];

                    if (
                        professors.some(
                            (item) => item._id === createdProfessor._id,
                        )
                    ) {
                        return current;
                    }

                    return {
                        professors: [createdProfessor, ...professors],
                    };
                },
            );
        },
    });

    const addProfessor = async () => {
        const displayName = professorName.trim();

        if (!displayName) {
            setProfessorError("Enter the professor's name.");
            return;
        }

        try {
            const result = await addProfessorMutation.mutateAsync(displayName);

            setProfessorName("");
            setProfessorError("");
            setAddProfessorOpen(false);

            toast.success(
                result.professor.status === "approved"
                    ? "Professor selected."
                    : "Professor added and sent for review.",
            );
        } catch (error) {
            setProfessorError(
                error instanceof ApiError
                    ? error.message
                    : "The professor could not be added.",
            );
        }
    };

    const submit = form.handleSubmit(async (values) => {
        if (!course) {
            toast.error("Choose a course.");
            return;
        }
        if (!isExternal && !file) {
            toast.error("Choose a PDF to upload.");
            return;
        }
        if (isExternal && !values.externalUrl.trim()) {
            form.setError("externalUrl", {
                message: "Enter the resource link.",
            });
            return;
        }

        const data = new FormData();
        data.append("courseId", course._id);
        if (professor) data.append("professorId", professor._id);
        data.append("title", values.title.trim());
        data.append("description", values.description.trim());
        data.append("resourceType", values.resourceType);
        data.append(
            "topics",
            JSON.stringify(
                values.topics
                    .split(",")
                    .map((topic) => topic.trim())
                    .filter(Boolean),
            ),
        );
        if (isExternal) data.append("externalUrl", values.externalUrl.trim());
        if (file) data.append("file", file);

        try {
            const result = await createMutation.mutateAsync(data);
            await queryClient.invalidateQueries({ queryKey: ["resources"] });
            toast.success("Submitted for moderator review.");
            navigate(`/resources/${result.resource._id}`);
        } catch (error) {
            form.setError("root", {
                message:
                    error instanceof ApiError
                        ? error.message
                        : "The resource could not be submitted.",
            });
        }
    });

    return (
        <div className="page narrow-page">
            <PageHeader
                title="Share a resource"
                description="Add something useful for the chapter. A moderator will review it before it appears in the library."
            />
            <Card className="form-card">
                <form onSubmit={submit} className="submission-form">
                    <Field
                        label="Course"
                        required
                        hint="Start typing a course code or title."
                    >
                        <CoursePicker
                            value={course}
                            onChange={(nextCourse) => {
                                if (nextCourse?._id !== course?._id) {
                                    setProfessor(null);
                                }

                                setCourse(nextCourse);
                            }}
                        />
                    </Field>

                    {course ? (
                        <Field
                            label="Professor"
                            hint="Optional. Leave blank if the resource applies to every section."
                        >
                            <ProfessorPicker
                                key={course._id}
                                courseId={course._id}
                                value={professor}
                                onChange={(nextProfessor) => {
                                    setProfessor(nextProfessor);
                                }}
                                onAdd={() => {
                                    setProfessorError("");
                                    setProfessorName("");
                                    setAddProfessorOpen(true);
                                }}
                            />
                        </Field>
                    ) : null}

                    <div className="two-column-fields">
                        <Field
                            label="Title"
                            required
                            error={form.formState.errors.title?.message}
                        >
                            <Input
                                placeholder="Example: Exam 2 memory management review"
                                {...form.register("title")}
                            />
                        </Field>
                        <Field
                            label="Resource type"
                            required
                            error={form.formState.errors.resourceType?.message}
                        >
                            <Select {...form.register("resourceType")}>
                                {RESOURCE_TYPES.map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    </div>

                    <Field
                        label="Description"
                        required
                        error={form.formState.errors.description?.message}
                    >
                        <Textarea
                            rows={5}
                            placeholder="Explain what the resource covers and why it is useful."
                            {...form.register("description")}
                        />
                    </Field>

                    <Field
                        label="Topics"
                        hint="Optional. Separate topics with commas."
                    >
                        <Input
                            placeholder="Pointers, inheritance, exam 2"
                            {...form.register("topics")}
                        />
                    </Field>

                    {isExternal ? (
                        <Field
                            label="Resource link"
                            required
                            error={form.formState.errors.externalUrl?.message}
                        >
                            <div className="input-with-icon">
                                <Link2 size={18} />
                                <Input
                                    type="url"
                                    placeholder="https://..."
                                    {...form.register("externalUrl")}
                                />
                            </div>
                        </Field>
                    ) : (
                        <Field
                            label="PDF file"
                            required
                            hint="PDF only. Maximum size is controlled by the server."
                        >
                            <label className="file-drop">
                                <input
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    onChange={(event) =>
                                        setFile(event.target.files?.[0] ?? null)
                                    }
                                />
                                {file ? (
                                    <FileText size={27} />
                                ) : (
                                    <UploadCloud size={29} />
                                )}
                                <span>
                                    <strong>
                                        {file ? file.name : "Choose a PDF"}
                                    </strong>
                                    <small>
                                        {file
                                            ? "Click to replace it"
                                            : "Click to browse your files"}
                                    </small>
                                </span>
                            </label>
                        </Field>
                    )}

                    <label className="confirmation-row">
                        <input
                            type="checkbox"
                            {...form.register("rightsConfirmed")}
                        />
                        <span>
                            I created this material or have permission to share
                            it, and it does not contain restricted exams, answer
                            keys, private information, or copyrighted textbook
                            scans.
                        </span>
                    </label>
                    {form.formState.errors.rightsConfirmed?.message ? (
                        <span className="field-error">
                            {form.formState.errors.rightsConfirmed.message}
                        </span>
                    ) : null}
                    {form.formState.errors.root?.message ? (
                        <div className="form-alert error">
                            {form.formState.errors.root.message}
                        </div>
                    ) : null}

                    <div className="form-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate(-1)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="lg"
                            loading={createMutation.isPending}
                        >
                            Submit for review
                        </Button>
                    </div>
                </form>
            </Card>

            <Modal
                open={addProfessorOpen}
                onClose={() => setAddProfessorOpen(false)}
                title="Add a professor"
                description={`Add a professor for ${course?.displayCode}. New names are reviewed by a moderator.`}
            >
                <div className="form-stack">
                    <Field label="Professor name" error={professorError}>
                        <Input
                            value={professorName}
                            onChange={(event) =>
                                setProfessorName(event.target.value)
                            }
                            placeholder="First and last name"
                            autoFocus
                        />
                    </Field>
                    <div className="modal-actions">
                        <Button
                            variant="ghost"
                            onClick={() => setAddProfessorOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            loading={addProfessorMutation.isPending}
                            onClick={() => void addProfessor()}
                        >
                            Add professor
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
