import type { GrimUploadRow } from "./import.model";

export type ExportListItem = {
  createdAt: number;
  updatedAt?: number;
  finalText?: string;
  imageUrl?: string;
  errorMessage?: string;
};

export function toPublicExportListItem(row: GrimUploadRow): ExportListItem {
  if (row.errorMessage) {
    return {
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      errorMessage: row.errorMessage
    };
  }

  if (row.imageUrl !== undefined && row.finalText !== undefined) {
    return {
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      finalText: row.finalText,
      imageUrl: row.imageUrl
    };
  }

  return { createdAt: row.createdAt };
}
