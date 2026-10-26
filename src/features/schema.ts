import { z } from "zod";
import { recipeSchema } from "../recipes/schema";
export const homeBlocks = [
  "hero",
  "stats",
  "today",
  "life",
  "projects",
] as const;
const id = z.string().min(1).max(300),
  date = z.iso.date(),
  title = z.string().trim().min(1).max(300);
// This module deliberately does not import app state: old snapshots acquire defaults.
export const featuresSchema = z.object({
  batches: z
    .array(
      z.object({
        id,
        date,
        days: z.number().int().min(1).max(3),
        servings: z.number().int().min(1).max(100),
        baseServings: z.number().int().min(1).max(100),
        recipe: recipeSchema,
      }),
    )
    .max(1000)
    .default(() => []),
  shoppingChecks: z
    .record(date, z.record(z.string().max(100000), z.boolean()))
    .default(() => ({})),
  shoppingExtras: z
    .array(z.object({ id, week: date, title, done: z.boolean() }))
    .max(2000)
    .default(() => []),
  home: z
    .object({
      order: z
        .array(z.enum(homeBlocks))
        .length(5)
        .refine((v) => new Set(v).size === 5),
      hidden: z.array(z.enum(homeBlocks)).max(5),
      start: z.enum(["home", "day"]),
      celebrate: z.boolean(),
    })
    .default(() => ({
      order: [...homeBlocks],
      hidden: [],
      start: "home" as const,
      celebrate: true,
    })),
  reminders: z
    .array(
      z.object({
        id,
        title,
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
        enabled: z.boolean(),
      }),
    )
    .max(100)
    .default(() => []),
  reminderPrefs: z
    .object({
      quietStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      quietEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    })
    .default(() => ({ quietStart: "22:00", quietEnd: "08:00" })),
  reminderDismissed: z
    .record(z.string().max(400), z.boolean())
    .default(() => ({})),
  reminderSnoozed: z
    .record(z.string().max(400), z.number().int().nonnegative())
    .default(() => ({})),
  recurring: z
    .array(
      z.object({
        id,
        title,
        amountMinor: z.number().int().positive().max(100000000000),
        category: z.string().trim().min(1).max(80),
        nextDate: date,
        anchorDay: z.number().int().min(1).max(31).default(1),
        enabled: z.boolean(),
      }),
    )
    .max(200)
    .default(() => []),
  savings: z
    .array(
      z.object({
        id,
        title,
        targetMinor: z.number().int().positive().max(100000000000),
        contributions: z
          .array(
            z.object({
              id,
              date,
              amountMinor: z.number().int().positive().max(100000000000),
            }),
          )
          .max(2000),
      }),
    )
    .max(200)
    .default(() => []),
});
export type Features = z.infer<typeof featuresSchema>;
export type Batch = Features["batches"][number];
export const emptyFeatures: Features = featuresSchema.parse({});
