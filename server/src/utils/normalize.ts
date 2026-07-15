export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^(dr|prof|professor)\.?\s+/i, "")
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9-\s]/g, " ")
    .replace(/\s+/g, " ");
}

export function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ");
}

export function normalizeTopic(value: string): string {
  return normalizeSearch(value).replace(/\s+/g, "-");
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
