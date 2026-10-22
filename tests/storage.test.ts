import "fake-indexeddb/auto";
import { openDB } from "idb";
import { describe, it, expect } from "vitest";
import { initialState } from "../src/data";
import { createStorage, StorageConflictError } from "../src/storage";
const name = () => `vspace-test-${crypto.randomUUID()}`;
describe("transactional storage", () => {
  it("roundtrips records and supports repeated saves", async () => {
    const db = name();
    const storage = createStorage(db);
    expect(await storage.load()).toBeNull();
    await storage.save(initialState);
    await storage.save({
      ...initialState,
      profile: { name: "Алина", focus: "Дизайн" },
    });
    expect((await createStorage(db).load())?.profile.name).toBe("Алина");
  });
  it("rejects stale writes from a second tab without losing the newer state", async () => {
    const db = name();
    const first = createStorage(db),
      second = createStorage(db);
    await first.load();
    await second.load();
    await first.save({
      ...initialState,
      profile: { name: "Первая вкладка", focus: "" },
    });
    await expect(
      second.save({
        ...initialState,
        profile: { name: "Устаревшая вкладка", focus: "" },
      }),
    ).rejects.toBeInstanceOf(StorageConflictError);
    expect((await createStorage(db).load())?.profile.name).toBe(
      "Первая вкладка",
    );
    await second.load();
    await second.save({
      ...initialState,
      profile: { name: "После обновления", focus: "" },
    });
    expect((await first.load())?.profile.name).toBe("После обновления");
  });
  it("does not overwrite unreadable data or save before load", async () => {
    const database = name();
    const db = await openDB(database, 1, {
      upgrade(db) {
        db.createObjectStore("universe");
      },
    });
    await db.put("universe", { broken: true }, "state");
    const storage = createStorage(database);
    await expect(storage.load()).rejects.toThrow();
    await expect(storage.save(initialState)).rejects.toThrow();
    expect(await db.get("universe", "state")).toEqual({ broken: true });
    db.close();
  });
  it("reads legacy snapshots without revisions", async () => {
    const database = name();
    const db = await openDB(database, 1, {
      upgrade(db) {
        db.createObjectStore("universe");
      },
    });
    await db.put("universe", initialState, "state");
    db.close();
    const storage = createStorage(database);
    expect(await storage.load()).toEqual(initialState);
    await storage.save({ ...initialState, favorites: ["oats"] });
    expect((await createStorage(database).load())?.favorites).toEqual(["oats"]);
  });
});
