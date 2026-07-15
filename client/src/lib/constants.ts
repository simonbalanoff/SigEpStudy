import type { ReportReason, ResourceStatus, ResourceType, UserRole } from "../types";

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  study_guide: "Study guide",
  class_notes: "Class notes",
  practice_problems: "Practice problems",
  formula_sheet: "Formula sheet",
  flashcards: "Flashcards",
  project_guide: "Project guide",
  external_link: "External link",
  other: "Other"
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  pending: "Pending review",
  approved: "Published",
  changes_requested: "Changes requested",
  rejected: "Rejected",
  removed: "Removed"
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  copyright: "Copyright concern",
  academic_integrity: "Academic integrity",
  personal_information: "Personal information",
  incorrect_course: "Incorrect course",
  inappropriate: "Inappropriate content",
  spam: "Spam",
  other: "Other"
};

export const ROLE_LABELS: Record<UserRole, string> = {
  member: "Member",
  moderator: "Moderator",
  admin: "Administrator"
};

export const RESOURCE_TYPES = Object.entries(RESOURCE_TYPE_LABELS) as Array<[ResourceType, string]>;
export const REPORT_REASONS = Object.entries(REPORT_REASON_LABELS) as Array<[ReportReason, string]>;
