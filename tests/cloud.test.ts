import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { initialState } from "../src/data";
import type { AppState, Task } from "../src/data";
import { createStorage } from "../src/storage";
import { mergeWorkspaces, same } from "../src/cloud/merge";
import { WorkspaceEngine, RevisionConflict } from "../src/cloud/engine";
import type { CloudTransport, RemoteSnapshot } from "../src/cloud/engine";
const state = () => structuredClone(initialState);
const task = (id: string, title = id): Task => ({
  id,
  title,
  date: "2026-10-22",
  priority: "medium",
  repeat: "none",
  done: false,
  completedAt: null,
});
const store = () => createStorage("cloud-test-" + crypto.randomUUID());
class Server implements CloudTransport {
  value: RemoteSnapshot | null = null;
  offline = false;
  beforeWrite: (() => void) | null = null;
  async read() {
    if (this.offline) throw Error("offline");
    return structuredClone(this.value);
  }
  async write(data: AppState, revision: number) {
    this.beforeWrite?.();
    this.beforeWrite = null;
    if (this.offline) throw Error("offline");
    if ((this.value?.revision || 0) !== revision) throw new RevisionConflict();
    this.value = { data: structuredClone(data), revision: revision + 1 };
    return revision + 1;
  }
}
async function ready(engine: WorkspaceEngine) {
  await engine.initialize();
  await engine.sync();
}
async function saved(engine: WorkspaceEngine) {
  await engine.flush();
  await engine.sync();
  await engine.flush();
}
describe("three-way merge", () => {
  it("merges independent additions, habit days and entity fields", () => {
    const b = state();
    b.habits = [
      {
        id: "water",
        title: "Вода",
        target: 8,
        unit: "стаканов",
        icon: "water",
        entries: {},
      },
    ];
    b.tasks = [task("one")];
    const l = structuredClone(b),
      r = structuredClone(b);
    l.tasks[0].title = "Changed";
    r.tasks[0].priority = "high";
    l.tasks.push(task("local"));
    r.tasks.push(task("remote"));
    l.habits[0].entries["2026-10-21"] = 2;
    r.habits[0].entries["2026-10-22"] = 4;
    const result = mergeWorkspaces(b, l, r);
    expect(result.conflicts).toEqual([]);
    expect(result.data.tasks).toHaveLength(3);
    expect(result.data.tasks.find((t) => t.id === "one")).toMatchObject({
      title: "Changed",
      priority: "high",
    });
    expect(result.data.habits[0].entries).toEqual({
      "2026-10-21": 2,
      "2026-10-22": 4,
    });
  });
  it("propagates deletion without resurrecting an unchanged remote record", () => {
    const b = { ...state(), tasks: [task("one")] };
    const l = { ...b, tasks: [] };
    expect(mergeWorkspaces(b, l, b).data.tasks).toEqual([]);
  });
  it("detects delete-vs-edit and same-field conflicts", () => {
    const b = { ...state(), tasks: [task("one")] };
    const r = { ...b, tasks: [task("one", "remote")] };
    expect(mergeWorkspaces(b, { ...b, tasks: [] }, r).conflicts).toHaveLength(
      1,
    );
    const l = { ...b, tasks: [task("one", "local"), task("extra")] };
    const result = mergeWorkspaces(b, l, r, "cloud");
    expect(result.conflicts).toHaveLength(1);
    expect(result.data.tasks.find((t) => t.id === "one")?.title).toBe("remote");
    expect(result.data.tasks.some((t) => t.id === "extra")).toBe(true);
  });
  it("compares object keys semantically and merges favorite membership", () => {
    expect(same({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    const b = { ...state(), favorites: ["oats"] };
    const l = { ...b, favorites: ["salmon"] };
    const r = { ...b, favorites: ["oats", "salad"] };
    expect(mergeWorkspaces(b, l, r).data.favorites.sort()).toEqual([
      "salad",
      "salmon",
    ]);
  });
});
describe("sync coordinator", () => {
  it("syncs two devices and independently edited records", async () => {
    const server = new Server();
    const a = new WorkspaceEngine(store(), server),
      b = new WorkspaceEngine(store(), server);
    await ready(a);
    await ready(b);
    a.update((s) => ({ ...s, tasks: [task("a")] }));
    await saved(a);
    b.update((s) => ({ ...s, tasks: [task("b")] }));
    await saved(b);
    await a.sync();
    expect(
      a
        .getSnapshot()
        .data.tasks.map((t) => t.id)
        .sort(),
    ).toEqual(["a", "b"]);
    expect(b.getSnapshot().data.tasks).toHaveLength(2);
    a.stop();
    b.stop();
  });
  it("persists offline edits through restart, then uploads them", async () => {
    const server = new Server(),
      db = store();
    const a = new WorkspaceEngine(db, server);
    await ready(a);
    server.offline = true;
    a.update((s) => ({ ...s, tasks: [task("offline")] }));
    await saved(a);
    expect(a.getSnapshot().dirty).toBe(true);
    a.stop();
    const restored = new WorkspaceEngine(db, server);
    await ready(restored);
    expect(restored.getSnapshot().data.tasks[0].id).toBe("offline");
    server.offline = false;
    await restored.sync();
    expect(server.value?.data.tasks[0].id).toBe("offline");
    expect(restored.getSnapshot().dirty).toBe(false);
    restored.stop();
  });
  it("requires explicit resolution and retains unrelated edits", async () => {
    const server = new Server();
    server.value = { data: { ...state(), tasks: [task("one")] }, revision: 1 };
    const a = new WorkspaceEngine(store(), server);
    await ready(a);
    server.offline = true;
    a.update((s) => ({ ...s, tasks: [task("one", "device"), task("extra")] }));
    await saved(a);
    server.value = {
      data: { ...state(), tasks: [task("one", "cloud")] },
      revision: 2,
    };
    server.offline = false;
    await a.sync();
    expect(a.getSnapshot().status).toBe("conflict");
    expect(a.getSnapshot().data.tasks[0].title).toBe("device");
    await a.resolve("cloud");
    expect(server.value?.data.tasks.find((t) => t.id === "one")?.title).toBe(
      "cloud",
    );
    expect(server.value?.data.tasks.some((t) => t.id === "extra")).toBe(true);
    a.stop();
  });
  it("retries a server revision race without losing data", async () => {
    const server = new Server();
    const a = new WorkspaceEngine(store(), server);
    await ready(a);
    server.beforeWrite = () => {
      server.value = {
        data: { ...state(), tasks: [task("remote")] },
        revision: 1,
      };
    };
    a.update((s) => ({ ...s, tasks: [task("local")] }));
    await saved(a);
    expect(server.value?.data.tasks.map((t) => t.id).sort()).toEqual([
      "local",
      "remote",
    ]);
    a.stop();
  });
  it("keeps changes entered while upload is in flight", async () => {
    const server = new Server();
    let release!: () => void;
    const transport: CloudTransport = {
      read: () => server.read(),
      write: async (d, r) => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return server.write(d, r);
      },
    };
    const a = new WorkspaceEngine(store(), transport);
    await ready(a);
    a.update((s) => ({ ...s, tasks: [task("first")] }));
    await a.flush();
    const inflight = a.sync();
    await new Promise((resolve) => setTimeout(resolve, 20));
    a.update((s) => ({ ...s, tasks: [...s.tasks, task("second")] }));
    release();
    await inflight;
    await a.flush();
    await new Promise((resolve) => setTimeout(resolve, 20));
    release();
    await a.sync();
    expect(a.getSnapshot().data.tasks).toHaveLength(2);
    expect(server.value?.data.tasks).toHaveLength(2);
    a.stop();
  });
  it("keeps guest and account caches separate", async () => {
    const guest = store(),
      account = store();
    await guest.load();
    await guest.save({ ...state(), tasks: [task("private-guest")] });
    const a = new WorkspaceEngine(account, new Server());
    await ready(a);
    expect(a.getSnapshot().data.tasks).toHaveLength(0);
    expect((await guest.load())?.tasks[0].id).toBe("private-guest");
    a.stop();
  });
});
