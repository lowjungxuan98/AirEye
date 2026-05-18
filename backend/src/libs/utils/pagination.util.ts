import { API_ERROR_MESSAGES, invalidRequest } from "./api-error.util";

const createInvalidPageError = () =>
  invalidRequest(API_ERROR_MESSAGES.invalidPage);

export function parsePage(value: unknown): number {
  if (value === undefined) {
    return 1;
  }

  if (typeof value !== "string") {
    throw createInvalidPageError();
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw createInvalidPageError();
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createInvalidPageError();
  }

  return parsed;
}

/** Rows must be newest-first (same order as listUploads). */
export function buildPaginatedSlice<T>(
  rows: T[],
  page: number,
  limit: number
): { data: T[]; is_next: boolean } {
  const start = (page - 1) * limit;
  const data = rows.slice(start, start + limit);
  const is_next = rows.length > page * limit;
  return { data, is_next };
}

export function listUploadsFetchSize(page: number, limit: number): number {
  return page * limit + 1;
}
