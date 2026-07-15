import type { Course, Professor, Resource, User } from "../types";

export function getId(value: { _id?: string; id?: string } | string | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
}

export function getCourse(resource: Resource): Course | null {
  return typeof resource.courseId === "string" ? null : resource.courseId;
}

export function getProfessor(resource: Resource): Professor | null {
  if (!resource.professorId || typeof resource.professorId === "string") return null;
  return resource.professorId;
}

export function getUploader(resource: Resource): User | null {
  return typeof resource.uploaderId === "string" ? null : resource.uploaderId;
}

export function fullName(user: User | string | null | undefined): string {
  if (!user || typeof user === "string") return "Member";
  return `${user.firstName} ${user.lastName}`.trim();
}

export function initials(user: Pick<User, "firstName" | "lastName">): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

export function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
  }).format(date);
}

export function formatDateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function formatBytes(value?: number): string {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function actionLabel(action: string): string {
  return action.replaceAll(".", " ").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
