export type UserRole = "member" | "moderator" | "admin";
export type UserStatus = "active" | "suspended";
export type ResourceType =
  | "study_guide"
  | "class_notes"
  | "practice_problems"
  | "formula_sheet"
  | "flashcards"
  | "project_guide"
  | "external_link"
  | "other";
export type ResourceStatus = "pending" | "approved" | "changes_requested" | "rejected" | "removed";
export type ProfessorStatus = "pending" | "approved" | "rejected" | "merged";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type ReportReason =
  | "copyright"
  | "academic_integrity"
  | "personal_information"
  | "incorrect_course"
  | "inappropriate"
  | "spam"
  | "other";

export interface User {
  id?: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  _id: string;
  subjectCode: string;
  courseNumber: string;
  displayCode: string;
  title: string;
  description?: string;
  aliases?: string[];
  active?: boolean;
}

export interface Professor {
  _id: string;
  displayName: string;
  normalizedName?: string;
  aliases?: string[];
  status: ProfessorStatus;
  createdBy?: User | string;
  approvedBy?: User | string;
  mergedIntoProfessorId?: string;
  createdAt?: string;
}

export interface Resource {
  _id: string;
  courseId: Course | string;
  professorId?: Professor | string;
  uploaderId: User | string;
  title: string;
  description: string;
  resourceType: ResourceType;
  topics: string[];
  storageKind: "file" | "external";
  originalFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  externalUrl?: string;
  status: ResourceStatus;
  isSaved?: boolean;
  moderationNote?: string;
  moderatedAt?: string;
  publishedAt?: string;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceDetailResponse {
  resource: Resource;
  course: Course | null;
  professor: Professor | null;
  saved: boolean;
  markedHelpful: boolean;
}

export interface Invitation {
  _id?: string;
  id?: string;
  label?: string;
  active: boolean;
  expiresAt?: string;
  useCount?: number;
  lastUsedAt?: string;
  lastUsedBy?: User | string;
  createdAt: string;
  inviteUrl?: string;
  createdBy?: User | string;
}

export interface Report {
  _id: string;
  resourceId: Resource | string;
  reporterId: User | string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  resolutionNote?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AuditEvent {
  _id: string;
  actorId: User | string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResources {
  resources: Resource[];
  pagination: Pagination;
}

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}
