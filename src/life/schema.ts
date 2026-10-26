import { z } from "zod";
const date = z.iso.date();
const id = z.string().min(1).max(300);
const title = z.string().trim().min(1).max(300);
const note = z.string().max(5000);
export const areas = [
  "health",
  "career",
  "finance",
  "growth",
  "relationships",
  "rest",
] as const;
const area = z.enum(areas);
export const goalSchema = z.object({
  id,
  title,
  area,
  start: date,
  duration: z.union([z.literal(21), z.literal(90)]),
  why: note,
  reward: z.string().max(500),
  steps: z.array(z.object({ id, title, done: z.boolean() })).max(100),
  habitIds: z.array(id).max(200),
  dailyEntries: z.record(date, z.boolean()).default(() => ({})),
});
export const journalSchema = z.object({
  mood: z.number().int().min(1).max(5),
  stress: z.number().int().min(0).max(10),
  emotion: z.enum(["calm", "happy", "anxious", "sad", "tired", "angry"]),
  thoughts: note,
  gratitude: note,
  needs: note,
  tinyStep: z.string().max(500),
});
export const transactionSchema = z.object({
  id,
  date,
  type: z.enum(["income", "expense"]),
  amountMinor: z.number().int().positive().max(100_000_000_000),
  category: z.string().trim().min(1).max(80),
  note: z.string().max(500),
});
const nutrient = z.number().min(0).max(2000).nullable();
export const foodEntrySchema = z.object({
  id,
  date,
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  title,
  grams: z.number().positive().max(20000).nullable(),
  calories: z.number().min(0).max(20000).nullable(),
  protein: nutrient,
  fat: nutrient,
  carbs: nutrient,
  estimated: z.boolean(),
});
const weeklySchema = z.object({
  priorities: z.array(z.object({ id, title, done: z.boolean() })).max(5),
  focus: note,
  wins: note,
  energy: note,
  learned: note,
  remove: note,
  next: note,
  joy: note,
  reward: z.string().max(500),
});
const score = z.object({
  score: z.number().int().min(0).max(10),
  importance: z.number().int().min(1).max(5),
});
export const lifeSchema = z.object({
  weekPlans: z.record(date, weeklySchema).default(() => ({})),
  goals: z
    .array(goalSchema)
    .max(200)
    .default(() => []),
  journal: z.record(date, journalSchema).default(() => ({})),
  thoughts: z
    .array(
      z.object({
        id,
        text: note.min(1),
        date,
        bucket: z.enum(["inbox", "remove", "solve", "do", "later"]),
        taskId: z.string().max(300).nullable(),
      }),
    )
    .max(2000)
    .default(() => []),
  balance: z.record(date, z.record(area, score)).default(() => ({})),
  transactions: z
    .array(transactionSchema)
    .max(10000)
    .default(() => []),
  budgets: z
    .record(
      z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      z.number().int().min(0).max(100_000_000_000),
    )
    .default(() => ({})),
  foodLog: z
    .array(foodEntrySchema)
    .max(10000)
    .default(() => []),
  water: z.record(date, z.number().int().min(0).max(20000)).default(() => ({})),
  nutritionTargets: z
    .object({
      calories: z.number().positive().max(20000).nullable(),
      protein: nutrient,
      fat: nutrient,
      carbs: nutrient,
      waterMl: z.number().int().positive().max(20000).nullable(),
    })
    .default(() => ({
      calories: null,
      protein: null,
      fat: null,
      carbs: null,
      waterMl: null,
    })),
  activity: z
    .record(
      date,
      z.object({
        steps: z.number().int().min(0).max(200000).nullable(),
        workoutMinutes: z.number().int().min(0).max(1440).nullable(),
        weightKg: z.number().min(20).max(500).nullable(),
      }),
    )
    .default(() => ({})),
  inspiration: z
    .object({
      poster: z
        .enum(["orbit", "sunrise", "mountain", "bloom", "waves", "stars"])
        .nullable(),
      savedQuotes: z.array(id).max(300),
      customQuotes: z
        .array(z.object({ id, text: z.string().trim().min(1).max(500) }))
        .max(200),
    })
    .default(() => ({ poster: null, savedQuotes: [], customQuotes: [] })),
});
export type LifeState = z.infer<typeof lifeSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type JournalEntry = z.infer<typeof journalSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type FoodEntry = z.infer<typeof foodEntrySchema>;
export const emptyLife: LifeState = lifeSchema.parse({});
