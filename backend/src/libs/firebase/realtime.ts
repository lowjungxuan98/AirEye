import type { Database } from "firebase-admin/database";
import { getDatabase } from "firebase-admin/database";
import type { App } from "firebase-admin/app";
import { sortByCreatedAtDesc } from "../utils/sort-by-created-at.util";
import type { GrimUpload, GrimUploadRow } from "../../api/v1/model/import.model";
import type { UploadRepository } from "../../api/v1/model/services.model";
import type {
  ProviderState,
  ProviderStateRepository
} from "../utils/provider_orchestrator.util";

const UPLOADS_PATH = "uploads";
const PROVIDER_STATE_PATH = "provider_state";

export type RealtimeNamespace = "development" | "production";

export function getRealtimeDb(app: App): Database {
  return getDatabase(app);
}

export class FirebaseUploadRepository implements UploadRepository {
  constructor(
    private readonly database: Database,
    private readonly namespace: RealtimeNamespace
  ) {}

  async createPendingUpload(id: string, upload: GrimUpload): Promise<void> {
    await this.database.ref(uploadPath(this.namespace, id)).set(upload);
  }

  async updateUpload(id: string, updates: Partial<GrimUpload>): Promise<void> {
    const path = await this.resolveUploadPath(id);
    await this.database.ref(path).update(updates);
  }

  async getUpload(id: string): Promise<GrimUploadRow | null> {
    const path = await this.resolveUploadPath(id);
    const snapshot = await this.database.ref(path).once("value");
    const value = snapshot.val() as GrimUpload | null;
    return value ? { ...value, id } : null;
  }

  async listUploads(limit: number): Promise<GrimUploadRow[]> {
    const snapshot = await this.database
      .ref(nsPath(this.namespace, UPLOADS_PATH))
      .orderByChild("createdAt")
      .limitToLast(limit)
      .once("value");
    const raw = snapshot.val() as Record<string, GrimUpload> | null;
    const rows = Object.entries(raw ?? {}).map(([id, upload]) => ({ ...upload, id }));
    return sortByCreatedAtDesc(rows);
  }

  private async resolveUploadPath(id: string): Promise<string> {
    const directPath = uploadPath(this.namespace, id);
    const directSnapshot = await this.database.ref(directPath).once("value");
    if (directSnapshot.exists()) {
      return directPath;
    }

    const namespaceSnapshot = await this.database.ref(nsPath(this.namespace, "")).once("value");
    const foundPath = findChildPathByKey(namespaceSnapshot.val(), id);
    return foundPath ? nsPath(this.namespace, foundPath) : directPath;
  }
}

export class FirebaseProviderStateRepository implements ProviderStateRepository {
  constructor(
    private readonly database: Database,
    private readonly namespace: RealtimeNamespace
  ) {}

  async getProviderState(): Promise<ProviderState | null> {
    const snapshot = await this.database
      .ref(nsPath(this.namespace, PROVIDER_STATE_PATH))
      .once("value");
    const value = snapshot.val() as Partial<ProviderState> | null;
    return typeof value?.current_provide === "string"
      ? ({ current_provide: value.current_provide } as ProviderState)
      : null;
  }

  async setProviderState(state: ProviderState): Promise<void> {
    await this.database.ref(nsPath(this.namespace, PROVIDER_STATE_PATH)).set(state);
  }
}

function uploadPath(namespace: RealtimeNamespace, id: string): string {
  return nsPath(namespace, `${UPLOADS_PATH}/${id}`);
}

function nsPath(namespace: RealtimeNamespace, childPath: string): string {
  return `${namespace}/${childPath.replace(/^\/+/, "")}`;
}

function findChildPathByKey(value: unknown, targetKey: string, prefix = ""): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = prefix ? `${prefix}/${key}` : key;
    if (key === targetKey) {
      return childPath;
    }
    const nested = findChildPathByKey(child, targetKey, childPath);
    if (nested) {
      return nested;
    }
  }

  return null;
}
