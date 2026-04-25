import { ApiError } from "../../../libs/utils/api-error.util";
import { EXPORT_DEFAULT_LIMIT, EXPORT_MAX_LIMIT } from "../../../libs/constants/limits.contant";
import { buildPaginatedSlice, listUploadsFetchSize } from "../../../libs/utils/pagination.util";
import { toPublicExportListItem, type ExportListItem } from "../model/export.model";
import type { UploadRepository } from "../model/services.model";

const createInvalidLimitError = () =>
  new ApiError(400, "INVALID_REQUEST", "limit must be a positive integer");

export function parseExportLimit(value: unknown): number {
  if (value === undefined) {
    return EXPORT_DEFAULT_LIMIT;
  }

  if (typeof value !== "string") {
    throw createInvalidLimitError();
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw createInvalidLimitError();
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createInvalidLimitError();
  }

  return Math.min(parsed, EXPORT_MAX_LIMIT);
}

export type ExportListPageResult = {
  data: ExportListItem[];
  page: number;
  limit: number;
  is_next: boolean;
};

export class ExportService {
  constructor(private readonly uploads: UploadRepository) {}

  async listItemsPage(page: number, limit: number): Promise<ExportListPageResult> {
    const fetchSize = listUploadsFetchSize(page, limit);
    const rows = await this.uploads.listUploads(fetchSize);
    const { data, is_next } = buildPaginatedSlice(rows, page, limit);
    return {
      data: data.map(toPublicExportListItem),
      page,
      limit,
      is_next
    };
  }
}
