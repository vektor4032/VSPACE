import { shiftDate } from "../data";
import type { AppState } from "../data";
import type { Goal, Transaction, FoodEntry } from "./schema";
export const areaLabels = {
  health: "Здоровье",
  career: "Работа и учёба",
  finance: "Финансы",
  growth: "Личное развитие",
  relationships: "Отношения",
  rest: "Отдых и хобби",
};
export const areaColors = {
  health: "#39e6a2",
  career: "#a991ff",
  finance: "#b7ff36",
  growth: "#c2f4ff",
  relationships: "#edb5c7",
  rest: "#e8b478",
};
export const mondayOf = (date: string) => {
  const day = new Date(date + "T12:00:00Z").getUTCDay();
  return shiftDate(date, -((day + 6) % 7));
};
export const dateRange = (end: string, length: number) =>
  Array.from({ length }, (_, i) => shiftDate(end, i - length + 1));
export function goalProgress(goal: Goal, today: string) {
  const end = shiftDate(goal.start, goal.duration - 1);
  const elapsed = Math.max(
    0,
    Math.min(
      goal.duration,
      Math.floor(
        (Date.parse(today + "T12:00:00Z") -
          Date.parse(goal.start + "T12:00:00Z")) /
          86400000,
      ) + 1,
    ),
  );
  const done = goal.steps.filter((s) => s.done).length;
  return {
    end,
    elapsed,
    remaining: goal.duration - elapsed,
    done,
    total: goal.steps.length,
    percent: goal.steps.length ? (done / goal.steps.length) * 100 : 0,
  };
}
export function moneyToMinor(raw: string): number {
  const value = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value))
    throw Error("Введите сумму с максимум двумя знаками после запятой");
  const [whole, decimal = ""] = value.split(".");
  const result = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result > 100_000_000_000)
    throw Error("Сумма слишком большая");
  return result;
}
export const rubles = (minor: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: minor % 100 ? 2 : 0,
  }).format(minor / 100);
export function financeStats(transactions: Transaction[], month: string) {
  const records = transactions.filter((t) => t.date.startsWith(month));
  const income = records
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + t.amountMinor, 0);
  const expense = records
    .filter((t) => t.type === "expense")
    .reduce((a, t) => a + t.amountMinor, 0);
  const categories = new Map<string, number>();
  for (const t of records)
    if (t.type === "expense")
      categories.set(
        t.category,
        (categories.get(t.category) || 0) + t.amountMinor,
      );
  return {
    records,
    income,
    expense,
    balance: income - expense,
    categories: [...categories.entries()].sort((a, b) => b[1] - a[1]),
  };
}
export function nutritionStats(records: FoodEntry[]) {
  const keys = ["calories", "protein", "fat", "carbs"] as const;
  return Object.fromEntries(
    keys.map((key) => [
      key,
      {
        total: records.reduce((sum, r) => sum + (r[key] ?? 0), 0),
        known: records.filter((r) => r[key] !== null).length,
      },
    ]),
  ) as Record<(typeof keys)[number], { total: number; known: number }>;
}
export function periodSummary(state: AppState, end: string, length: number) {
  const days = dateRange(end, length);
  const done = state.tasks.filter(
    (t) => t.done && t.completedAt && days.includes(t.completedAt),
  ).length;
  const habits = state.habits.reduce(
    (a, h) => a + days.filter((d) => (h.entries[d] || 0) >= h.target).length,
    0,
  );
  const journals = days.filter((d) => !!state.life.journal[d]);
  const mood = journals.length
    ? journals.reduce((sum, d) => sum + state.life.journal[d].mood, 0) /
      journals.length
    : null;
  const activity = days.map((d) => state.life.activity[d]).filter(Boolean);
  return {
    days,
    done,
    habits,
    journalCount: journals.length,
    mood,
    workoutMinutes: activity.reduce(
      (sum, d) => sum + (d.workoutMinutes ?? 0),
      0,
    ),
  };
}
