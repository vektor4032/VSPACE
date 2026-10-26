import { describe, it, expect } from "vitest";
import { initialState, parseImport, recipes } from "../src/data";
import type { Recipe } from "../src/recipes/schema";
import type { Batch } from "../src/features/schema";
import {
  shoppingList,
  parseIngredientLine,
  parseMeasure,
  servesOn,
} from "../src/features/shopping";
import { nextMonth, payRecurring } from "../src/features/finance";
import {
  inQuietHours,
  dueReminders,
  reminderCalendar,
} from "../src/features/reminders";
import { challengeProgress } from "../src/life/stats";
import { goalSchema } from "../src/life/schema";
import { mergeWorkspaces } from "../src/cloud/merge";
import { searchWorkspace } from "../src/features/GlobalSearch";
const batch = (
  id: string,
  ingredients: Recipe["ingredients"],
  servings = 2,
  baseServings = 2,
  date = "2026-10-26",
): Batch => ({
  id,
  date,
  days: 3,
  servings,
  baseServings,
  recipe: { ...recipes[0], id, title: id, ingredients },
});
describe("weekly cooking and shopping", () => {
  it("scales a cooked batch once and combines compatible units across recipes", () => {
    const a = batch(
      "a",
      [
        ["Рис", 100, "г"],
        ["Молоко", 0.5, "л"],
      ],
      6,
    );
    const b = batch(
      "b",
      [
        ["риса", 0.2, "кг"],
        ["молоко", 250, "мл"],
      ],
      2,
    );
    const list = shoppingList([a, b], "2026-10-26");
    expect(list.find((i) => i.name === "рис")).toMatchObject({
      amount: 500,
      unit: "г",
    });
    expect(list.find((i) => i.name === "молоко")).toMatchObject({
      amount: 1750,
      unit: "мл",
    });
    expect(servesOn(a, "2026-10-28")).toBe(true);
    expect(servesOn(a, "2026-10-29")).toBe(false);
  });
  it("keeps weight and volume separate and flags unknown quantities instead of adding zero", () => {
    const list = shoppingList(
      [
        batch("a", [
          ["Масло", 100, "г"],
          ["Масло", 100, "мл"],
          ["Соль", null, "по вкусу"],
        ]),
      ],
      "2026-10-26",
    );
    expect(list).toHaveLength(3);
    expect(list.find((i) => i.name === "соль")).toMatchObject({
      amount: null,
      notes: ["Соль — по вкусу"],
    });
  });
  it("does not buy leftovers again in the next week and invalidates purchased marks when quantity changes", () => {
    const a = batch("a", [["Рис", 100, "г"]], 2, 2, "2026-11-01");
    expect(servesOn(a, "2026-11-02")).toBe(true);
    expect(shoppingList([a], "2026-11-02")).toEqual([]);
    const first = shoppingList([a], "2026-10-26")[0];
    const changed = shoppingList([{ ...a, servings: 4 }], "2026-10-26")[0];
    expect(first.key).not.toBe(changed.key);
  });
  it("reads common Russian lines and source measures, preserving ambiguous ranges", () => {
    expect(parseIngredientLine("200 г риса")).toEqual(["рис", 200, "г"]);
    expect(parseIngredientLine("2 помидора")).toEqual(["помидоры", 2, "шт"]);
    expect(parseIngredientLine("1-2 помидора")[1]).toBeNull();
    expect(parseMeasure("1 1/2 tbsp")).toEqual({ amount: 1.5, unit: "tbsp" });
    expect(parseMeasure("½ cup")).toEqual({ amount: 0.5, unit: "cup" });
    expect(parseMeasure("to taste")).toBeNull();
    expect(parseIngredientLine("200 риса")).toEqual(["рис", null, "200"]);
    const unknown = shoppingList(
      [
        batch("u", [
          ["Milk", null, "100"],
          ["Eggs", null, "2"],
        ]),
      ],
      "2026-10-26",
    );
    expect(unknown.find((i) => i.name === "молоко")?.amount).toBeNull();
    expect(unknown.find((i) => i.name === "яйца")).toMatchObject({
      amount: 2,
      unit: "шт",
    });
  });
});
describe("practical daily features", () => {
  it("loads old snapshots with feature defaults and keeps their existing challenge entries", () => {
    const { features, ...old } = structuredClone(initialState);
    expect(parseImport(JSON.stringify(old)).features).toEqual(features);
  });
  it("counts scheduled challenge days and preserves rest-day records without counting them", () => {
    const goal = goalSchema.parse({
      id: "g",
      title: "Зал",
      area: "health",
      duration: 21,
      start: "2026-10-26",
      why: "",
      reward: "",
      steps: [],
      habitIds: [],
      weekdays: [1, 3, 5],
      dailyEntries: { "2026-10-26": true, "2026-10-27": true },
    });
    expect(challengeProgress(goal, "2026-10-28")).toMatchObject({
      done: 1,
      total: 9,
      percent: (1 / 9) * 100,
    });
    expect(challengeProgress(goal, "2026-10-28").plannedDays).not.toContain(
      "2026-10-27",
    );
  });
  it("keeps monthly dates anchored at month end and records an overdue payment only once", () => {
    expect(nextMonth("2027-01-31", 31)).toBe("2027-02-28");
    expect(nextMonth("2027-02-28", 31)).toBe("2027-03-31");
    const s = structuredClone(initialState);
    s.features.recurring = [
      {
        id: "r",
        title: "Аренда",
        amountMinor: 10000,
        category: "Жильё",
        nextDate: "2026-10-01",
        anchorDay: 1,
        enabled: true,
      },
    ];
    const paid = payRecurring(s, "r", "2026-10-01", "2026-10-26");
    expect(paid.life.transactions).toHaveLength(1);
    expect(paid.life.transactions[0].date).toBe("2026-10-26");
    expect(paid.features.recurring[0].nextDate).toBe("2026-11-01");
    expect(payRecurring(paid, "r", "2026-10-01", "2026-10-26")).toBe(paid);
  });
  it("respects quiet hours, selected days, snoozing and dismissal", () => {
    expect(inQuietHours("23:00", "22:00", "08:00")).toBe(true);
    expect(inQuietHours("07:00", "22:00", "08:00")).toBe(true);
    expect(inQuietHours("12:00", "22:00", "08:00")).toBe(false);
    expect(inQuietHours("12:00", "12:00", "12:00")).toBe(false);
    const f = structuredClone(initialState.features);
    f.reminders = [
      { id: "r", title: "Вода", time: "09:00", days: [1], enabled: true },
    ];
    const now = new Date(2026, 9, 26, 12, 0);
    expect(dueReminders(f, now)).toHaveLength(1);
    f.reminderSnoozed["r:2026-10-26"] = now.getTime() + 900000;
    expect(dueReminders(f, now)).toHaveLength(0);
    f.reminderSnoozed = {};
    f.reminderDismissed["r:2026-10-26"] = true;
    expect(dueReminders(f, now)).toHaveLength(0);
  });
  it("exports a recurring calendar event with an alarm and safely escaped text", () => {
    const ics = reminderCalendar(
      {
        id: "r",
        title: "Вода, пауза; отдых\nСейчас",
        time: "09:00",
        days: [1, 3, 5],
        enabled: true,
      },
      new Date(2026, 9, 26, 8),
    );
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("DTSTART:20261026T090000");
    expect(ics).toContain("Вода\\, пауза\\; отдых\\nСейчас");
  });
  it("merges independent shopping marks and batches from different devices", () => {
    const base = structuredClone(initialState),
      a = structuredClone(base),
      b = structuredClone(base);
    a.features.batches = [batch("a", [["Рис", 100, "г"]])];
    b.features.batches = [batch("b", [["Рис", 200, "г"]])];
    a.features.shoppingChecks["2026-10-26"] = { one: true };
    b.features.shoppingChecks["2026-10-26"] = { two: true };
    const result = mergeWorkspaces(base, a, b);
    expect(result.conflicts).toEqual([]);
    expect(result.data.features.batches).toHaveLength(2);
    expect(result.data.features.shoppingChecks["2026-10-26"]).toEqual({
      one: true,
      two: true,
    });
  });
  it("searches private notes and saved recipes locally", () => {
    const state = structuredClone(initialState);
    state.life.thoughts = [
      {
        id: "t",
        date: "2026-10-26",
        text: "Обсудить поездку в Карелию",
        bucket: "inbox",
        taskId: null,
      },
    ];
    expect(searchWorkspace(state, "карелию")[0]).toMatchObject({
      type: "Мысль",
      title: "Обсудить поездку в Карелию",
    });
    expect(
      searchWorkspace(state, "овсянка").some((r) => r.type === "Рецепт"),
    ).toBe(true);
  });
});
