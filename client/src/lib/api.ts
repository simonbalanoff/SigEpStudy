import type { ApiErrorBody } from "../types";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api/v1";

export function apiUrl(path: string): string {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new ApiError(
      body.error?.message || `Request failed with status ${response.status}.`,
      response.status,
      body.error?.code,
      body.error?.details
    );
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return undefined as T;
  return response.json() as Promise<T>;
}

export function queryString(values: Record<string, string | number | boolean | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const result = params.toString();
  return result ? `?${result}` : "";
}

export async function fetchProtectedFile(resourceId: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(apiUrl(`/resources/${resourceId}/file`), {
    credentials: "include",
    signal
  });
  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new ApiError(body.error?.message || "The PDF could not be loaded.", response.status, body.error?.code);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function downloadProtectedFile(resourceId: string, fileName = "resource.pdf"): Promise<void> {
  const response = await fetch(apiUrl(`/resources/${resourceId}/file`), { credentials: "include" });
  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new ApiError(body.error?.message || "The file could not be downloaded.", response.status, body.error?.code);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    return await response.json() as ApiErrorBody;
  } catch {
    return {};
  }
}
