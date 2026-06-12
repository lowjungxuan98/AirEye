import {
  API_ERROR_MESSAGES,
  fieldMustBeNonEmptyString,
  invalidRequest
} from "./api-error.util";

export type JsonObjectBody = Record<string, unknown>;

export function readJsonObjectBody(body: unknown): JsonObjectBody {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw invalidRequest(API_ERROR_MESSAGES.expectedJsonObjectBody);
  }
  return body as JsonObjectBody;
}

export function readNonEmptyString(body: JsonObjectBody, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw fieldMustBeNonEmptyString(field);
  }
  return value.trim();
}

export function readBoolean(body: JsonObjectBody, field: string): boolean {
  const value = body[field];
  if (typeof value !== "boolean") {
    throw invalidRequest(`${field} must be a boolean`);
  }
  return value;
}
