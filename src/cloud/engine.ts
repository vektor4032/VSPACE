import { initialState } from "../data";
import type { AppState } from "../data";
import { StorageConflictError } from "../storage";
import type { SyncMetadata, WorkspaceStorage } from "../storage";
import { mergeWorkspaces, same } from "./merge";
export type RemoteSnapshot = { data: AppState; revision: number };
export interface CloudTransport {
  read(): Promise<RemoteSnapshot | null>;
  write(data: AppState, revision: number): Promise<number>;
}
export class RevisionConflict extends Error {}
export type SyncStatus =
  "local" | "syncing" | "synced" | "offline" | "conflict" | "error";
export type WorkspaceView = {
  data: AppState;
  ready: boolean;
  fatal: string;
  localSaving: boolean;
  localError: string;
  status: SyncStatus;
  message: string;
  lastSynced: string | null;
  conflicts: string[];
  dirty: boolean;
};
export class WorkspaceEngine {
  private current: AppState = structuredClone(initialState);
  private meta: SyncMetadata = {
    baseline: structuredClone(initialState),
    revision: 0,
    lastSynced: null,
  };
  private tail: Promise<void> = Promise.resolve();
  private running: Promise<void> | null = null;
  private stopped = false;
  private pending = 0;
  private conflictRemote: RemoteSnapshot | null = null;
  private listeners = new Set<() => void>();
  private view: WorkspaceView = {
    data: this.current,
    ready: false,
    fatal: "",
    localSaving: false,
    localError: "",
    status: "local",
    message: "",
    lastSynced: null,
    conflicts: [],
    dirty: false,
  };
  constructor(
    private store: WorkspaceStorage,
    private cloud: CloudTransport | null,
  ) {}
  getSnapshot = () => this.view;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private emit(patch: Partial<WorkspaceView> = {}) {
    if (this.stopped) return;
    this.view = {
      ...this.view,
      data: this.current,
      dirty: !!this.cloud && !same(this.current, this.meta.baseline),
      lastSynced: this.meta.lastSynced,
      ...patch,
    };
    this.listeners.forEach((fn) => fn());
  }
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.tail.then(fn);
    this.tail = task.then(
      () => {},
      () => {},
    );
    return task;
  }
  async initialize() {
    try {
      const data = await this.store.load();
      const meta = await this.store.loadMetadata();
      if (this.stopped) return;
      this.current = data ?? structuredClone(initialState);
      if (meta) this.meta = meta;
      this.emit({ ready: true, status: this.cloud ? "syncing" : "local" });
      if (this.cloud) void this.sync();
    } catch {
      this.emit({
        ready: true,
        fatal:
          "Не удалось прочитать локальные данные. Данные оставлены без изменений.",
      });
    }
  }
  update = (fn: (s: AppState) => AppState) => {
    if (!this.view.ready || this.view.fatal || this.stopped) return;
    this.current = fn(this.current);
    this.pending++;
    this.emit({ localSaving: true });
    void this.enqueue(async () => {
      try {
        await this.store.saveWithMetadata(this.current, this.meta);
        this.emit({ localError: "" });
      } catch (cause) {
        this.emit({
          localError:
            cause instanceof StorageConflictError
              ? cause.message
              : "Не удалось сохранить изменения на устройстве. Экспортируйте данные перед закрытием.",
          status: "error",
        });
      } finally {
        this.pending--;
        this.emit({ localSaving: this.pending > 0 });
      }
    }).then(() => {
      if (this.cloud) void this.sync();
    });
  };
  async flush() {
    await this.tail;
  }
  sync = (): Promise<void> => {
    if (this.running) return this.running;
    if (
      !this.cloud ||
      this.stopped ||
      !this.view.ready ||
      this.view.fatal ||
      this.view.localError ||
      this.view.status === "conflict"
    )
      return Promise.resolve();
    this.running = this.run().finally(() => {
      this.running = null;
      if (!this.stopped && this.view.dirty && this.view.status === "synced")
        void this.sync();
    });
    return this.running;
  };
  private async run() {
    this.emit({ status: "syncing", message: "" });
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const remote = (await this.cloud!.read()) ?? {
          data: structuredClone(initialState),
          revision: 0,
        };
        if (this.stopped) return;
        const captured = await this.enqueue(async () => {
          if (this.stopped || this.view.localError) return null;
          const input = this.current;
          const result = mergeWorkspaces(
            this.meta.baseline,
            input,
            remote.data,
          );
          if (result.conflicts.length) {
            this.conflictRemote = remote;
            this.emit({
              status: "conflict",
              conflicts: result.conflicts,
              message:
                "Одни и те же записи изменились на разных устройствах. Выберите версию перед продолжением.",
            });
            return null;
          }
          const metadata = {
            ...this.meta,
            baseline: remote.data,
            revision: remote.revision,
          };
          if (
            !same(result.data, this.current) ||
            remote.revision !== this.meta.revision ||
            !same(this.meta.baseline, remote.data)
          )
            await this.store.saveWithMetadata(result.data, metadata);
          this.current = same(this.current, input)
            ? result.data
            : mergeWorkspaces(input, this.current, result.data).data;
          this.meta = metadata;
          this.emit();
          return {
            data: structuredClone(this.current),
            revision: this.meta.revision,
          };
        });
        if (!captured) return;
        if (same(captured.data, remote.data)) {
          await this.markSynced(captured.data, remote.revision);
          return;
        }
        if (this.stopped) return;
        try {
          const revision = await this.cloud!.write(
            captured.data,
            captured.revision,
          );
          if (this.stopped) return;
          await this.markSynced(captured.data, revision);
          return;
        } catch (e) {
          if (e instanceof RevisionConflict) continue;
          throw e;
        }
      }
      this.emit({
        status: "error",
        message:
          "Данные часто меняются на другом устройстве. Повторите синхронизацию.",
      });
    } catch (e) {
      if (this.stopped) return;
      this.emit({
        status:
          typeof navigator !== "undefined" && !navigator.onLine
            ? "offline"
            : "error",
        message:
          e instanceof Error
            ? e.message
            : "Нет связи с облаком. Изменения остаются на этом устройстве.",
      });
    }
  }
  private async markSynced(baseline: AppState, revision: number) {
    await this.enqueue(async () => {
      if (this.stopped || this.view.localError) return;
      if (
        this.meta.lastSynced &&
        this.meta.revision === revision &&
        same(this.meta.baseline, baseline) &&
        same(this.current, baseline)
      ) {
        this.emit({ status: "synced", message: "", conflicts: [] });
        return;
      }
      const metadata = {
        baseline,
        revision,
        lastSynced: new Date().toISOString(),
      };
      await this.store.saveWithMetadata(this.current, metadata);
      this.meta = metadata;
      this.emit({ status: "synced", message: "", conflicts: [] });
    });
  }
  resolve = async (choice: "device" | "cloud") => {
    await this.enqueue(async () => {
      if (!this.conflictRemote) return;
      const remote = this.conflictRemote;
      const data = mergeWorkspaces(
        this.meta.baseline,
        this.current,
        remote.data,
        choice,
      ).data;
      const metadata = {
        ...this.meta,
        baseline: remote.data,
        revision: remote.revision,
      };
      await this.store.saveWithMetadata(data, metadata);
      this.current = data;
      this.meta = metadata;
      this.conflictRemote = null;
      this.emit({ status: "syncing", message: "", conflicts: [] });
    });
    await this.sync();
  };
  stop() {
    this.stopped = true;
    this.listeners.clear();
  }
}
