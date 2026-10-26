import { z } from "zod";
const webUrl = z
  .string()
  .max(2000)
  .refine(
    (value) => !value || (/^https?:\/\//i.test(value) && URL.canParse(value)),
    "Нужна ссылка HTTP или HTTPS",
  );
export const recipeSchema = z.object({
  id: z.string().min(1).max(300),
  title: z.string().trim().min(1).max(300),
  category: z.enum(["Завтрак", "Обед", "Ужин"]),
  time: z.number().int().min(1).max(1440).nullable(),
  servings: z.number().int().min(1).max(100).nullable(),
  calories: z.number().min(0).max(20000).nullable(),
  emoji: z.string().min(1).max(20),
  color: z.enum(["red", "peach", "green", "yellow", "violet", "pink", "mint"]),
  ingredients: z
    .array(
      z.tuple([
        z.string().trim().min(1).max(500),
        z.number().positive().max(100000).nullable(),
        z.string().max(150),
      ]),
    )
    .min(1)
    .max(100),
  steps: z.array(z.string().trim().min(1).max(5000)).min(1).max(100),
  sourceUrl: webUrl.default(""),
  sourceName: z.string().max(150).default(""),
  savedAt: z.iso.date().optional(),
});
export type Recipe = z.infer<typeof recipeSchema>;
