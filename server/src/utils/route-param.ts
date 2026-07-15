import { AppError } from "./app-error.js";

export function routeParam(value: string | string[] | undefined, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(400, "MISSING_ROUTE_PARAMETER", `${name} is required.`);
  }
  return value;
}
