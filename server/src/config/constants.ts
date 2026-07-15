export const USER_ROLES = ["member", "moderator", "admin"] as const;
export const USER_STATUSES = ["active", "suspended"] as const;
export const PROFESSOR_STATUSES = ["pending", "approved", "merged", "rejected"] as const;
export const RESOURCE_TYPES = [
  "study_guide",
  "class_notes",
  "practice_problems",
  "formula_sheet",
  "flashcards",
  "project_guide",
  "external_link",
  "other"
] as const;
export const RESOURCE_STATUSES = [
  "pending",
  "approved",
  "changes_requested",
  "rejected",
  "removed"
] as const;
export const REPORT_REASONS = [
  "copyright",
  "academic_integrity",
  "personal_information",
  "incorrect_course",
  "inappropriate",
  "spam",
  "other"
] as const;
export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
