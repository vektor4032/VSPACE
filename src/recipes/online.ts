import { recipeSchema } from "./schema";
import type { Recipe } from "./schema";
const host = "https://www.themealdb.com/api/json/v1/1";
const translations: Record<string, string> = {
  курица: "chicken",
  курицей: "chicken",
  куриный: "chicken",
  куриные: "chicken",
  рис: "rice",
  рисом: "rice",
  паста: "pasta",
  макароны: "pasta",
  суп: "soup",
  рыба: "fish",
  рыбой: "fish",
  лосось: "salmon",
  говядина: "beef",
  говядиной: "beef",
  свинина: "pork",
  овощи: "vegetarian",
  овощной: "vegetarian",
  картофель: "potato",
  картошка: "potato",
  яйца: "egg",
  яйцо: "egg",
  завтрак: "breakfast",
  блины: "pancakes",
  овсянка: "oats",
  чечевица: "lentils",
  нут: "chickpeas",
  сыр: "cheese",
  салат: "salad",
  шоколад: "chocolate",
};
export function onlineQuery(query: string) {
  const trimmed = query.trim();
  const key = trimmed.toLowerCase();
  return Object.hasOwn(translations, key) ? translations[key] : trimmed;
}
function safeSource(value: unknown, id: string) {
  if (typeof value === "string" && value.length <= 2000) {
    try {
      const url = new URL(value);
      if (
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      )
        return url.href;
    } catch {}
  }
  return `https://www.themealdb.com/meal/${id}`;
}
export function normalizeMeal(
  value: unknown,
  category: Recipe["category"],
): Recipe | null {
  if (!value || typeof value !== "object") return null;
  const meal = value as Record<string, unknown>;
  const id = String(meal.idMeal || "");
  if (!/^\d{1,12}$/.test(id)) return null;
  const ingredients: Recipe["ingredients"] = [];
  for (let i = 1; i <= 20; i++) {
    const name = String(meal[`strIngredient${i}`] || "").trim();
    const measure = String(meal[`strMeasure${i}`] || "").trim();
    if (name) ingredients.push([name, null, measure]);
  }
  const instructions = String(meal.strInstructions || "").trim();
  const lines = instructions
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed = recipeSchema.safeParse({
    id: "mealdb-" + id,
    cover:
      typeof meal.strMealThumb === "string" &&
      meal.strMealThumb.startsWith("https://") &&
      meal.strMealThumb.length < 2000
        ? meal.strMealThumb
        : "",
    title: String(meal.strMeal || ""),
    category: meal.strCategory === "Breakfast" ? "Завтрак" : category,
    time: null,
    servings: null,
    calories: null,
    emoji: "🍽️",
    color: "green",
    ingredients,
    steps: lines.length ? lines : [instructions],
    sourceName: "TheMealDB",
    sourceUrl: safeSource(meal.strSource, id),
  });
  return parsed.success ? parsed.data : null;
}
async function request(path: string, signal: AbortSignal) {
  const response = await fetch(`${host}/${path}`, {
    signal,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok)
    throw Error(
      "Каталог сейчас недоступен. Попробуйте позже или откройте поиск в интернете.",
    );
  const text = await response.text();
  if (text.length > 2_000_000) throw Error("Ответ каталога слишком большой");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw Error("Каталог вернул некорректный ответ");
  }
  if (
    !data ||
    typeof data !== "object" ||
    (data.meals !== null && !Array.isArray(data.meals))
  )
    throw Error("Каталог вернул некорректный ответ");
  return data.meals || [];
}
export async function searchOnlineRecipes(
  query: string,
  category: Recipe["category"],
  signal: AbortSignal,
): Promise<Recipe[]> {
  const translated = onlineQuery(query);
  if (!translated) return [];
  let meals = await request(
    `search.php?s=${encodeURIComponent(translated)}`,
    signal,
  );
  if (!meals.length) {
    const matches = await request(
      `filter.php?i=${encodeURIComponent(translated)}`,
      signal,
    );
    const ids = matches
      .slice(0, 9)
      .map((m: Record<string, unknown>) => String(m.idMeal || ""))
      .filter((id: string) => /^\d{1,12}$/.test(id));
    const full = await Promise.all(
      ids.map(async (id: string) => {
        const records = await request(`lookup.php?i=${id}`, signal);
        return records[0];
      }),
    );
    meals = full;
  }
  return [
    ...new Map<string, Recipe>(
      meals
        .slice(0, 24)
        .map((meal: unknown) => normalizeMeal(meal, category))
        .filter((r: Recipe | null): r is Recipe => !!r)
        .map((r: Recipe) => [r.id, r]),
    ).values(),
  ];
}
export function webRecipeSearch(query: string, category: string) {
  return (
    "https://yandex.ru/search/?text=" +
    encodeURIComponent(
      `${query.trim()} ${category === "Все" ? "" : category.toLowerCase()} рецепт с ингредиентами пошагово`.trim(),
    )
  );
}
