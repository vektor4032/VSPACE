import { ImageField } from "../features/ImageField";
import { parseIngredientLine } from "../features/shopping";
import { useState } from "react";
import type { FormEvent } from "react";
import { useApp } from "../context";
import { uid } from "../data";
import { Modal } from "../components/ui";
import { recipeSchema } from "./schema";
import type { Recipe } from "./schema";
export function RecipeForm({
  recipe,
  onClose,
  onSaved,
}: {
  recipe?: Recipe;
  onClose: () => void;
  onSaved?: (r: Recipe) => void;
}) {
  const { state, update, today, toast } = useApp();
  const [error, setError] = useState("");
  const [cover, setCover] = useState(recipe?.cover || "");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!recipe && state.savedRecipes.length >= 500) {
      setError(
        "В моей книге уже 500 рецептов. Удалите ненужные перед добавлением новых.",
      );
      return;
    }
    const form = new FormData(e.currentTarget);
    const number = (name: string) =>
      String(form.get(name) || "").trim() ? Number(form.get(name)) : null;
    const ingredients = String(form.get("ingredients"))
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    const steps = String(form.get("steps"))
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    const parsed = recipeSchema.safeParse({
      id: recipe?.id || "personal-" + uid(),
      title: String(form.get("title")),
      category: form.get("category"),
      time: number("time"),
      servings: number("servings"),
      calories: number("calories"),
      emoji: recipe?.emoji || "🍽️",
      color: recipe?.color || "green",
      ingredients: ingredients.map(parseIngredientLine),
      cover,
      steps,
      sourceUrl: String(form.get("sourceUrl")).trim(),
      sourceName: recipe?.sourceName || "",
      savedAt: recipe?.savedAt || today,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    const next = parsed.data;
    update((s) => ({
      ...s,
      savedRecipes: recipe
        ? s.savedRecipes.map((r) => (r.id === recipe.id ? next : r))
        : [...s.savedRecipes, next],
    }));
    toast("Рецепт сохранён в моей книге");
    onSaved?.(next);
    onClose();
  }
  return (
    <Modal
      title={recipe ? "Изменить рецепт" : "Сохранить свой рецепт"}
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <label>
          Название рецепта
          <input
            name="title"
            required
            maxLength={300}
            defaultValue={recipe?.title}
            autoFocus
          />
        </label>
        <label>
          Категория
          <select name="category" defaultValue={recipe?.category || "Обед"}>
            {["Завтрак", "Обед", "Ужин"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <ImageField value={cover} onChange={setCover} label="Фото блюда" />
        <label>
          Ссылка на источник · необязательно
          <input
            name="sourceUrl"
            type="url"
            maxLength={2000}
            defaultValue={recipe?.sourceUrl}
            placeholder="https://…"
          />
        </label>
        <label>
          Ингредиенты с количеством
          <textarea
            name="ingredients"
            required
            rows={6}
            maxLength={30000}
            defaultValue={recipe?.ingredients
              .map(([name, amount, unit]) =>
                amount === null
                  ? `${name}${unit ? ` — ${unit}` : ""}`
                  : `${amount} ${unit} ${name}`,
              )
              .join("\n")}
            placeholder={"200 г риса\n2 помидора\n1 ст. л. масла"}
          />
          <span className="field-help">
            Каждый ингредиент — с новой строки: «200 г риса», «2 помидора».
            Понятные количества попадут в автоматический список покупок;
            остальные сохранятся текстом.
          </span>
        </label>
        <label>
          Как приготовить
          <textarea
            name="steps"
            required
            rows={6}
            maxLength={50000}
            defaultValue={recipe?.steps.join("\n")}
            placeholder={
              "Промойте рис и отварите.\nНарежьте овощи и смешайте с рисом."
            }
          />
          <span className="field-help">Каждый шаг — с новой строки.</span>
        </label>
        <div className="form-grid">
          <label>
            Время, минут · если известно
            <input
              name="time"
              type="number"
              min="1"
              max="1440"
              defaultValue={recipe?.time ?? ""}
            />
          </label>
          <label>
            На сколько порций
            <input
              name="servings"
              type="number"
              min="1"
              max="100"
              defaultValue={recipe?.servings ?? ""}
            />
          </label>
        </div>
        <label>
          Калории на порцию · если известны
          <input
            name="calories"
            type="number"
            min="0"
            max="20000"
            step="0.1"
            defaultValue={recipe?.calories ?? ""}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="btn primary">Сохранить рецепт</button>
      </form>
    </Modal>
  );
}
