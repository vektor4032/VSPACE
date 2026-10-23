import { describe, it, expect } from "vitest";
import { initialState, parseImport, stateSchema } from "../src/data";
import {
  financeStats,
  moneyToMinor,
  nutritionStats,
  goalProgress,
  mondayOf,
  periodSummary,
} from "../src/life/stats";
import type { Goal, FoodEntry, Transaction } from "../src/life/schema";
import { mergeWorkspaces } from "../src/cloud/merge";
const fresh = () => structuredClone(initialState);
const transaction = (
  id: string,
  date: string,
  amountMinor: number,
  type: "income" | "expense" = "expense",
  category = "Еда",
): Transaction => ({ id, date, amountMinor, type, category, note: "" });
const goal: Goal = {
  id: "goal",
  title: "Выучить новое",
  start: "2026-10-01",
  duration: 21,
  area: "growth",
  why: "",
  reward: "",
  habitIds: [],
  steps: [
    { id: "one", title: "Начать", done: false },
    { id: "two", title: "Завершить", done: true },
  ],
};
describe("life data and calculations", () => {
  it("loads legacy backups with empty new sections, preserving original records", () => {
    const { life, ...old } = fresh();
    old.tasks.push({
      id: "old",
      title: "Моя задача",
      date: "2026-10-23",
      priority: "high",
      done: false,
      completedAt: null,
      repeat: "none",
    });
    const parsed = parseImport(JSON.stringify(old));
    expect(parsed.life).toEqual(life);
    expect(parsed.tasks).toEqual(old.tasks);
    parsed.life.goals.push(goal);
    expect(fresh().life.goals).toEqual([]);
    expect(parseImport(JSON.stringify(parsed))).toEqual(parsed);
  });
  it("stores decimal rubles as exact integer kopecks and rejects ambiguous amounts", () => {
    expect(moneyToMinor("1 234,56")).toBe(123456);
    expect(moneyToMinor("0.10") + moneyToMinor("0.20")).toBe(30);
    expect(moneyToMinor("0")).toBe(0);
    for (const value of ["-2", "1.234", "1e3", "NaN", "1000000001", "1,2,3"])
      expect(() => moneyToMinor(value)).toThrow();
  });
  it("filters months, separates income from spending and handles arbitrary category names", () => {
    const result = financeStats(
      [
        transaction("a", "2026-10-01", 100000, "income"),
        transaction("b", "2026-10-02", 20000),
        transaction("c", "2026-10-20", 3500, "expense", "__proto__"),
        transaction("d", "2026-09-20", 999999),
      ],
      "2026-10",
    );
    expect(result).toMatchObject({
      income: 100000,
      expense: 23500,
      balance: 76500,
    });
    expect(result.categories).toEqual([
      ["Еда", 20000],
      ["__proto__", 3500],
    ]);
  });
  it("counts completed steps independently of inclusive calendar progress", () => {
    expect(goalProgress(goal, "2026-09-30")).toMatchObject({
      elapsed: 0,
      remaining: 21,
      percent: 50,
      end: "2026-10-21",
    });
    expect(goalProgress(goal, "2026-10-01").elapsed).toBe(1);
    expect(goalProgress(goal, "2026-11-01")).toMatchObject({
      elapsed: 21,
      remaining: 0,
      percent: 50,
    });
    expect(
      goalProgress({ ...goal, duration: 90, steps: [] }, "2026-10-23"),
    ).toMatchObject({ end: "2026-12-29", elapsed: 23, percent: 0, total: 0 });
    expect(mondayOf("2026-10-25")).toBe("2026-10-19");
  });
  it("distinguishes missing nutrients from recorded zero and sums only known portions", () => {
    const a: FoodEntry = {
      id: "a",
      date: "2026-10-23",
      slot: "breakfast",
      title: "Еда",
      grams: null,
      calories: 0,
      protein: null,
      fat: 5,
      carbs: null,
      estimated: true,
    };
    const b = { ...a, id: "b", calories: 250, protein: 10, fat: null };
    expect(nutritionStats([a, b])).toEqual({
      calories: { known: 2, total: 250 },
      protein: { known: 1, total: 10 },
      fat: { known: 1, total: 5 },
      carbs: { known: 0, total: 0 },
    });
  });
  it("rejects invalid financial records and duplicate imported IDs", () => {
    const s = fresh();
    s.life.transactions = [transaction("a", "2026-02-30", 100)];
    expect(stateSchema.safeParse(s).success).toBe(false);
    s.life.transactions = [
      transaction("a", "2026-10-23", 100),
      transaction("a", "2026-10-23", 200),
    ];
    expect(() => parseImport(JSON.stringify(s))).toThrow(/идентификаторы/);
    s.life.transactions = [transaction("a", "2026-10-23", -100)];
    expect(stateSchema.safeParse(s).success).toBe(false);
  });
  it("merges independent device entries and goal steps without losing any section", () => {
    const b = fresh();
    b.life.goals = [goal];
    const l = structuredClone(b),
      r = structuredClone(b);
    l.life.transactions.push(transaction("computer", "2026-10-23", 500));
    r.life.transactions.push(transaction("phone", "2026-10-23", 200));
    l.life.goals[0].steps[0].done = true;
    r.life.goals[0].reward = "Прогулка";
    r.life.water["2026-10-23"] = 500;
    const result = mergeWorkspaces(b, l, r);
    expect(result.conflicts).toEqual([]);
    expect(result.data.life.transactions).toHaveLength(2);
    expect(result.data.life.goals[0]).toMatchObject({
      reward: "Прогулка",
      steps: [{ done: true }, { done: true }],
    });
    expect(result.data.life.water["2026-10-23"]).toBe(500);
    expect(parseImport(JSON.stringify(result.data))).toEqual(result.data);
  });
  it("summary does not average missing journal days as zero", () => {
    const s = fresh();
    s.life.journal["2026-10-23"] = {
      mood: 4,
      stress: 0,
      emotion: "calm",
      thoughts: "",
      gratitude: "",
      needs: "",
      tinyStep: "",
    };
    s.life.activity["2026-10-22"] = {
      steps: null,
      weightKg: null,
      workoutMinutes: 30,
    };
    expect(periodSummary(s, "2026-10-23", 7)).toMatchObject({
      journalCount: 1,
      mood: 4,
      workoutMinutes: 30,
      done: 0,
      habits: 0,
    });
  });
});
