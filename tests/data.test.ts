import { describe, it, expect } from "vitest";
import {
  initialState,
  parseImport,
  toggleTask,
  habitStreak,
  shiftDate,
  recipes,
} from "../src/data";
import type { Habit, Task } from "../src/data";
const task: Task = {
  id: "test",
  title: "Читать",
  date: "2026-10-22",
  priority: "medium",
  done: false,
  repeat: "daily",
  completedAt: null,
};
describe("VSPACE data integrity", () => {
  it("roundtrips a complete backup", () => {
    expect(parseImport(JSON.stringify(initialState))).toEqual(initialState);
  });
  it("rejects unsupported and malformed backups", () => {
    expect(() => parseImport("{")).toThrow();
    expect(() =>
      parseImport(JSON.stringify({ ...initialState, version: 2 })),
    ).toThrow();
    expect(() =>
      parseImport(
        JSON.stringify({
          ...initialState,
          tasks: [{ ...task, date: "2026-02-30" }],
        }),
      ),
    ).toThrow();
  });
  it("rejects duplicate IDs and unsafe project URLs", () => {
    expect(() =>
      parseImport(JSON.stringify({ ...initialState, tasks: [task, task] })),
    ).toThrow();
    expect(() =>
      parseImport(
        JSON.stringify({
          ...initialState,
          projects: [
            {
              id: "p",
              title: "P",
              category: "Design",
              status: "idea",
              priority: "low",
              deadline: "",
              notes: "",
              links: ["javascript:alert(1)"],
              steps: [],
              color: "lime",
            },
          ],
        }),
      ),
    ).toThrow();
  });
  it("completes a task and creates only one next recurring task", () => {
    let state = toggleTask(
      { ...initialState, tasks: [task] },
      task.id,
      "2026-10-22",
    );
    expect(state.tasks).toHaveLength(2);
    expect(state.tasks[0].completedAt).toBe("2026-10-22");
    expect(state.tasks[1].date).toBe("2026-10-23");
    state = toggleTask(state, task.id);
    state = toggleTask(state, task.id);
    expect(state.tasks).toHaveLength(2);
  });
  it("handles week recurrence across month boundaries", () => {
    const state = toggleTask(
      {
        ...initialState,
        tasks: [{ ...task, date: "2026-12-29", repeat: "weekly" }],
      },
      task.id,
    );
    expect(state.tasks[1].date).toBe("2027-01-05");
  });
  it("counts streaks from today or yesterday without counting gaps", () => {
    const h: Habit = {
      id: "h",
      title: "Water",
      icon: "water",
      target: 2,
      unit: "cups",
      entries: { "2026-10-20": 2, "2026-10-21": 2, "2026-10-22": 1 },
    };
    expect(habitStreak(h, "2026-10-22")).toBe(2);
    expect(habitStreak(h, "2026-10-24")).toBe(0);
  });
  it("shifts local dates correctly across year and leap day", () => {
    expect(shiftDate("2028-02-28", 1)).toBe("2028-02-29");
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("ships usable recipes with quantities and ordered instructions", () => {
    expect(recipes.length).toBeGreaterThanOrEqual(6);
    for (const r of recipes) {
      expect(r.ingredients.length).toBeGreaterThan(3);
      expect(r.steps.length).toBeGreaterThan(2);
      expect(r.ingredients.every((i) => i[1] > 0)).toBe(true);
    }
  });
});
