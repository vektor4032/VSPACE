import { z } from "zod";
import { lifeSchema, emptyLife } from "./life/schema";
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const shiftDate = (date: string, n: number) => {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return localDate(d);
};
export const uid = () => crypto.randomUUID();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) => localDate(new Date(v + "T12:00:00")) === v,
    "Некорректная дата",
  );
const text = z.string().trim().min(1).max(300);
const priority = z.enum(["low", "medium", "high"]);
export const taskSchema = z.object({
  id: text,
  title: text,
  date,
  priority,
  done: z.boolean(),
  repeat: z.enum(["none", "daily", "weekly"]),
  completedAt: date.nullable(),
});
export const habitSchema = z.object({
  id: text,
  title: text,
  icon: z.enum([
    "water",
    "moon",
    "sun",
    "heart",
    "activity",
    "leaf",
    "sparkles",
  ]),
  target: z.number().int().min(1).max(100),
  unit: z.string().max(30),
  entries: z.record(date, z.number().int().min(0).max(100)),
});
export const projectSchema = z.object({
  id: text,
  title: text,
  category: text,
  status: z.enum(["idea", "active", "done"]),
  priority,
  deadline: z.union([date, z.literal("")]),
  notes: z.string().max(10000),
  links: z
    .array(
      z
        .string()
        .url()
        .refine((v) => /^https?:\/\//.test(v)),
    )
    .max(30),
  steps: z
    .array(z.object({ id: text, title: text, done: z.boolean() }))
    .max(200),
  color: z.enum(["lime", "violet", "mint"]),
});
export const stateSchema = z.object({
  life: lifeSchema.default(() => structuredClone(emptyLife)),
  version: z.literal(1),
  profile: z.object({ name: z.string().max(50), focus: z.string().max(150) }),
  settings: z.object({
    accent: z.enum(["lime", "mint", "violet"]),
    theme: z.enum(["dark", "forest"]),
    motion: z.enum(["full", "reduced", "off"]),
    three: z.boolean(),
  }),
  tasks: z.array(taskSchema).max(10000),
  habits: z.array(habitSchema).max(200),
  projects: z.array(projectSchema).max(1000),
  favorites: z.array(z.string()).max(200),
  meals: z
    .array(
      z.object({
        id: text,
        date,
        recipeId: text,
        slot: z.enum(["breakfast", "lunch", "dinner"]),
      }),
    )
    .max(10000),
  checkins: z.record(
    date,
    z.object({
      sleep: z.number().min(0).max(24),
      energy: z.number().min(1).max(5),
      mood: z.number().min(1).max(5),
    }),
  ),
});
export type AppState = z.infer<typeof stateSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Habit = z.infer<typeof habitSchema>;
export type Project = z.infer<typeof projectSchema>;
export const initialState: AppState = {
  life: structuredClone(emptyLife),
  version: 1,
  profile: { name: "", focus: "" },
  settings: { accent: "lime", theme: "dark", motion: "full", three: true },
  tasks: [],
  habits: [],
  projects: [],
  favorites: [],
  meals: [],
  checkins: {},
};
// Storage boundary: a future Supabase adapter can implement this interface.
export interface StorageAdapter {
  load(): Promise<AppState | null>;
  save(data: AppState): Promise<void>;
}
export function parseImport(raw: string): AppState {
  if (raw.length > 5_000_000)
    throw Error("Файл слишком большой (максимум 5 МБ)");
  const result = stateSchema.safeParse(JSON.parse(raw));
  if (!result.success)
    throw Error("Формат данных не соответствует резервной копии VSPACE v1");
  const s = result.data;
  for (const list of [
    s.tasks,
    s.habits,
    s.projects,
    s.meals,
    s.life.goals,
    s.life.thoughts,
    s.life.transactions,
    s.life.foodLog,
    s.life.inspiration.customQuotes,
  ]) {
    if (new Set(list.map((x) => x.id)).size !== list.length)
      throw Error("Обнаружены повторяющиеся идентификаторы");
  }
  return s;
}
export function toggleTask(
  state: AppState,
  id: string,
  today = localDate(),
): AppState {
  const tasks = [...state.tasks];
  const i = tasks.findIndex((t) => t.id === id);
  if (i < 0) return state;
  const t = tasks[i];
  tasks[i] = { ...t, done: !t.done, completedAt: t.done ? null : today };
  if (!t.done && t.repeat !== "none") {
    const next = shiftDate(t.date, t.repeat === "daily" ? 1 : 7);
    if (
      !tasks.some(
        (x) => x.title === t.title && x.date === next && x.repeat === t.repeat,
      )
    )
      tasks.push({
        ...t,
        id: uid(),
        date: next,
        done: false,
        completedAt: null,
      });
  }
  return { ...state, tasks };
}
export function habitStreak(h: Habit, today = localDate()) {
  let count = 0;
  let day = (h.entries[today] || 0) >= h.target ? today : shiftDate(today, -1);
  while ((h.entries[day] || 0) >= h.target && count < 10000) {
    count++;
    day = shiftDate(day, -1);
  }
  return count;
}
export type Recipe = {
  id: string;
  title: string;
  category: string;
  time: number;
  servings: number;
  calories: number;
  emoji: string;
  color: string;
  ingredients: [string, number, string][];
  steps: string[];
};
export const recipes: Recipe[] = [
  {
    id: "oats",
    title: "Овсянка с бананом и орехами",
    category: "Завтрак",
    time: 12,
    servings: 2,
    calories: 380,
    emoji: "🥣",
    color: "peach",
    ingredients: [
      ["Овсяные хлопья", 100, "г"],
      ["Молоко", 300, "мл"],
      ["Вода", 100, "мл"],
      ["Банан", 120, "г"],
      ["Грецкие орехи", 20, "г"],
      ["Корица", 1, "г"],
    ],
    steps: [
      "Доведите молоко и воду до слабого кипения в небольшом сотейнике.",
      "Добавьте хлопья и варите 5–7 минут на слабом огне, помешивая. Для других хлопьев следуйте времени на упаковке.",
      "Нарежьте банан, измельчите орехи. Разложите кашу по тарелкам, добавьте банан, орехи и корицу.",
    ],
  },
  {
    id: "salad",
    title: "Тёплый боул с киноа",
    category: "Обед",
    time: 30,
    servings: 2,
    calories: 440,
    emoji: "🥑",
    color: "green",
    ingredients: [
      ["Киноа сухая", 120, "г"],
      ["Вода", 240, "мл"],
      ["Нут консервированный без жидкости", 200, "г"],
      ["Авокадо (мякоть)", 100, "г"],
      ["Помидоры черри", 150, "г"],
      ["Лимонный сок", 20, "мл"],
      ["Оливковое масло", 10, "мл"],
      ["Соль", 2, "г"],
    ],
    steps: [
      "Промойте киноа в мелком сите. Залейте водой, доведите до кипения и готовьте под крышкой на слабом огне 15 минут. Снимите с огня и оставьте на 5 минут.",
      "Промойте нут. Разогрейте половину масла на сковороде и прогрейте нут 4–5 минут.",
      "Нарежьте авокадо и черри. Смешайте киноа с нутом и овощами. Заправьте оставшимся маслом, лимонным соком и солью.",
    ],
  },
  {
    id: "salmon",
    title: "Лосось с брокколи и лимоном",
    category: "Ужин",
    time: 30,
    servings: 2,
    calories: 420,
    emoji: "🍋",
    color: "yellow",
    ingredients: [
      ["Филе лосося", 300, "г"],
      ["Брокколи", 400, "г"],
      ["Лимон", 60, "г"],
      ["Оливковое масло", 15, "мл"],
      ["Чеснок", 6, "г"],
      ["Соль", 3, "г"],
      ["Чёрный перец", 1, "г"],
    ],
    steps: [
      "Разогрейте духовку до 200 °C. Разделите брокколи на небольшие соцветия, перемешайте с половиной масла и щепоткой соли.",
      "Выложите рыбу и брокколи в форму. Натрите рыбу оставшимся маслом, чесноком, солью и перцем; сверху положите ломтики лимона.",
      "Запекайте 15–20 минут до готовности рыбы (63 °C в самой толстой части) и мягкости брокколи. Для замороженного филе сначала выполните размораживание в холодильнике.",
    ],
  },
  {
    id: "pasta",
    title: "Паста с томатами и базиликом",
    category: "Обед",
    time: 25,
    servings: 2,
    calories: 430,
    emoji: "🍅",
    color: "red",
    ingredients: [
      ["Паста сухая", 160, "г"],
      ["Томаты в собственном соку", 400, "г"],
      ["Чеснок", 6, "г"],
      ["Оливковое масло", 15, "мл"],
      ["Пармезан", 20, "г"],
      ["Базилик", 10, "г"],
      ["Соль", 3, "г"],
    ],
    steps: [
      "Вскипятите воду, посолите и сварите пасту по инструкции на упаковке до al dente. Сохраните 100 мл воды от варки на базовые 2 порции.",
      "Прогрейте нарезанный чеснок в масле 30 секунд. Добавьте томаты, разомните лопаткой и тушите 12–15 минут.",
      "Смешайте пасту с соусом, добавляя воду от варки до желаемой консистенции. Подавайте с базиликом и тёртым пармезаном.",
    ],
  },
  {
    id: "eggs",
    title: "Шакшука с тёплыми специями",
    category: "Завтрак",
    time: 25,
    servings: 2,
    calories: 270,
    emoji: "🍳",
    color: "red",
    ingredients: [
      ["Яйца", 4, "шт"],
      ["Томаты в собственном соку", 400, "г"],
      ["Сладкий перец", 150, "г"],
      ["Лук", 80, "г"],
      ["Оливковое масло", 10, "мл"],
      ["Паприка", 2, "г"],
      ["Зира", 1, "г"],
      ["Соль", 2, "г"],
    ],
    steps: [
      "Нарежьте лук и перец. Обжаривайте в масле 6–8 минут на среднем огне.",
      "Добавьте специи и томаты. Тушите 10 минут, разминая томаты и помешивая.",
      "Сделайте углубления, разбейте в них яйца. Накройте крышкой и готовьте 6–8 минут до полного схватывания белка и желтка.",
    ],
  },
  {
    id: "soup",
    title: "Крем-суп из красной чечевицы",
    category: "Ужин",
    time: 35,
    servings: 3,
    calories: 310,
    emoji: "🥕",
    color: "peach",
    ingredients: [
      ["Красная чечевица сухая", 180, "г"],
      ["Морковь", 150, "г"],
      ["Лук", 100, "г"],
      ["Вода", 900, "мл"],
      ["Оливковое масло", 15, "мл"],
      ["Куркума", 2, "г"],
      ["Соль", 4, "г"],
      ["Лимонный сок", 15, "мл"],
    ],
    steps: [
      "Нарежьте лук и морковь. Обжарьте в масле в кастрюле 5 минут.",
      "Промойте чечевицу. Добавьте в кастрюлю вместе с водой и куркумой. Варите на слабом огне 20–25 минут до мягкости.",
      "Добавьте соль и лимонный сок. Измельчите погружным блендером, осторожно работая с горячим супом. При необходимости разбавьте горячей водой.",
    ],
  },
];
