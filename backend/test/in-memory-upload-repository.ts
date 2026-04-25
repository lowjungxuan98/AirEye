import type { GrimUpload, GrimUploadRow } from "../src/api/v1/model/import.model";
import type { UploadRepository } from "../src/api/v1/model/services.model";
import { sortByCreatedAtDesc } from "../src/libs/utils/sort-by-created-at.util";

/**
 * UploadRepository for app-level tests: no Firebase, deterministic list ordering
 * (newest {@link GrimUploadRow.createdAt} first), same sort as {@link FirebaseUploadRepository}.
 */
export class InMemoryUploadRepository implements UploadRepository {
  private readonly rows = new Map<string, GrimUploadRow>();

  async createPendingUpload(id: string, upload: GrimUpload): Promise<void> {
    this.rows.set(id, { id, ...upload });
  }

  async updateUpload(id: string, updates: Partial<GrimUpload>): Promise<void> {
    const row = this.rows.get(id);
    if (!row) {
      throw new Error(`upload not found: ${id}`);
    }
    this.rows.set(id, { ...row, ...updates });
  }

  async getUpload(id: string): Promise<GrimUploadRow | null> {
    return this.rows.get(id) ?? null;
  }

  async listUploads(limit: number): Promise<GrimUploadRow[]> {
    const sorted = sortByCreatedAtDesc([...this.rows.values()]);
    return sorted.slice(0, limit);
  }
}
