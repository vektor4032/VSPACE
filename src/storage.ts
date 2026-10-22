import { openDB } from "idb";
import { stateSchema } from "./data";
import type { AppState, StorageAdapter } from "./data";

export class StorageConflictError extends Error {
  constructor() {
    super(
      "Данные изменились в другой вкладке. Экспортируйте свои несохранённые изменения, затем перезагрузите страницу.",
    );
    this.name = "StorageConflictError";
  }
}

// Compare-and-swap inside a single IDB transaction prevents stale tabs from
// replacing newer snapshots. The revision is internal, never part of backups.
export type SyncMetadata = {
  baseline: AppState;
  revision: number;
  lastSynced: string | null;
};
export interface WorkspaceStorage extends StorageAdapter {
  loadMetadata(): Promise<SyncMetadata | null>;
  saveWithMetadata(data: AppState, metadata: SyncMetadata): Promise<void>;
}
export function createStorage(databaseName = "vspace"): WorkspaceStorage {
  let expectedRevision: number | null = null;
  const connect = () =>
    openDB(databaseName, 1, {
      upgrade(db) {
        db.createObjectStore("universe");
      },
    });
  async function write(data: AppState, metadata?: SyncMetadata) {
    if (expectedRevision === null)
      throw Error("Хранилище ещё не загружено. Автосохранение остановлено.");
    const parsed = stateSchema.parse(data);
    const db = await connect();
    try {
      const tx = db.transaction("universe", "readwrite");
      const revision = (await tx.store.get("revision")) ?? 0;
      if (revision !== expectedRevision) {
        await tx.done;
        throw new StorageConflictError();
      }
      await tx.store.put(parsed, "state");
      await tx.store.put(revision + 1, "revision");
      if (metadata) await tx.store.put(metadata, "cloud-metadata");
      await tx.done;
      expectedRevision = revision + 1;
    } finally {
      db.close();
    }
  }
  return {
    async loadMetadata() {
      const db = await connect();
      try {
        const m = await db.get("universe", "cloud-metadata");
        if (!m) return null;
        if (!Number.isSafeInteger(m.revision) || m.revision < 0)
          throw Error("Неверная ревизия облачного кеша");
        return { ...m, baseline: stateSchema.parse(m.baseline) };
      } finally {
        db.close();
      }
    },
    saveWithMetadata: write,
    async load() {
      const db = await connect();
      try {
        const tx = db.transaction("universe", "readonly");
        const [value, revision] = await Promise.all([
          tx.store.get("state"),
          tx.store.get("revision"),
        ]);
        await tx.done;
        const parsed = value === undefined ? null : stateSchema.parse(value);
        expectedRevision = revision ?? 0;
        return parsed;
      } finally {
        db.close();
      }
    },
    save: write,
  };
}
export const storage = createStorage();
