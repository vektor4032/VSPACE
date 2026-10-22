import { useState } from "react";
import { ArrowUpRight, Plus, X, Search, Heart, Clock } from "lucide-react";
import { uid, recipes } from "../data";
import type { Recipe } from "../data";
import { useApp } from "../context";
import {
  IconButton,
  Empty,
  Modal,
  PageHeading,
  SectionHead,
} from "../components/ui";

export function Food() {
  const { state, update, today } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [favorite, setFavorite] = useState(false);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [date, setDate] = useState(today);
  const list = recipes.filter(
    (r) =>
      (category === "Все" || r.category === category) &&
      (!favorite || state.favorites.includes(r.id)) &&
      (r.title + " " + r.ingredients.map((i) => i[0]).join(" "))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function toggleFavorite(id: string) {
    update((s) => ({
      ...s,
      favorites: s.favorites.includes(id)
        ? s.favorites.filter((x) => x !== id)
        : [...s.favorites, id],
    }));
  }
  return (
    <>
      <PageHeading
        eyebrow="NOURISH YOUR UNIVERSE"
        title="Еда, которая заряжает."
        description="Простые ингредиенты. Немного заботы. Много вкуса."
      />
      <section className="food-banner">
        <div>
          <span className="eyebrow">GOOD FOOD. GOOD MOOD.</span>
          <h2>
            Вдохновение
            <br />
            на каждый день<span>↗</span>
          </h2>
          <p>6 проверенных сочетаний для твоего ритма.</p>
        </div>
        <div className="food-banner-art" aria-hidden="true">
          <span>🥑</span>
          <span>🍋</span>
          <span>✳</span>
        </div>
      </section>
      <div className="toolbar">
        <div className="segmented">
          {["Все", "Завтрак", "Обед", "Ужин"].map((c) => (
            <button
              className={category === c ? "active" : ""}
              key={c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          className={`btn ${favorite ? "selected" : ""}`}
          aria-pressed={favorite}
          onClick={() => setFavorite(!favorite)}
        >
          <Heart size={16} fill={favorite ? "currentColor" : "none"} />{" "}
          Избранное
        </button>
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Найти рецепт или ингредиент"
            placeholder="Рецепт или ингредиент"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {list.length ? (
        <div className="recipe-grid">
          {list.map((r) => (
            <article className="recipe-card" key={r.id}>
              <button
                className={`recipe-art food-${r.color}`}
                onClick={() => setSelected(r)}
                aria-label={`Открыть рецепт: ${r.title}`}
              >
                <span>{r.emoji}</span>
                <div className="recipe-art-label">VSPACE / KITCHEN</div>
              </button>
              <button
                className={`favorite-btn ${state.favorites.includes(r.id) ? "selected" : ""}`}
                aria-label={`${state.favorites.includes(r.id) ? "Убрать из" : "Добавить в"} избранного: ${r.title}`}
                aria-pressed={state.favorites.includes(r.id)}
                onClick={() => toggleFavorite(r.id)}
              >
                <Heart
                  size={18}
                  fill={
                    state.favorites.includes(r.id) ? "currentColor" : "none"
                  }
                />
              </button>
              <div className="recipe-body">
                <span className="eyebrow">{r.category}</span>
                <button className="recipe-title" onClick={() => setSelected(r)}>
                  <h3>{r.title}</h3>
                  <ArrowUpRight size={20} />
                </button>
                <div className="recipe-meta">
                  <span>
                    <Clock size={14} /> {r.time} мин
                  </span>
                  <span>≈ {r.calories} ккал / порция</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Здесь пока пусто"
          description="Измените поиск или добавьте любимые рецепты в избранное."
        />
      )}
      <section className="meal-plan panel">
        <SectionHead
          index="01"
          title="Меню на день"
          action={
            <input
              aria-label="Дата меню"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          }
        />
        <div className="meal-slots">
          {[
            ["breakfast", "Завтрак"],
            ["lunch", "Обед"],
            ["dinner", "Ужин"],
          ].map(([slot, label]) => (
            <div key={slot}>
              <span className="eyebrow">{label}</span>
              {state.meals
                .filter((m) => m.date === date && m.slot === slot)
                .map((m) => {
                  const r = recipes.find((x) => x.id === m.recipeId);
                  return (
                    <div className="meal-entry" key={m.id}>
                      <button onClick={() => r && setSelected(r)}>
                        {r?.title || "Рецепт недоступен"}
                      </button>
                      <IconButton
                        label={`Удалить из меню: ${r?.title}`}
                        onClick={() =>
                          update((s) => ({
                            ...s,
                            meals: s.meals.filter((x) => x.id !== m.id),
                          }))
                        }
                      >
                        <X size={14} />
                      </IconButton>
                    </div>
                  );
                })}
              <select
                aria-label={`Добавить рецепт: ${label}`}
                value=""
                onChange={(e) => {
                  const recipeId = e.target.value;
                  update((s) => ({
                    ...s,
                    meals: [
                      ...s.meals,
                      {
                        id: uid(),
                        date,
                        recipeId,
                        slot: slot as "breakfast" | "lunch" | "dinner",
                      },
                    ],
                  }));
                }}
              >
                <option value="">+ Добавить блюдо</option>
                {recipes.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
      {selected && (
        <RecipeModal recipe={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function RecipeModal({
  recipe: r,
  onClose,
}: {
  recipe: Recipe;
  onClose: () => void;
}) {
  const { state, update, toast, today } = useApp();
  const [servings, setServings] = useState(r.servings);
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<"breakfast" | "lunch" | "dinner">("lunch");
  return (
    <Modal title={r.title} onClose={onClose}>
      <div className="recipe-detail">
        <div className="button-row">
          <span className="tag">
            <Clock size={14} /> {r.time} мин
          </span>
          <span className="tag">{r.category}</span>
          <span className="tag">≈ {r.calories} ккал / порция</span>
        </div>
        <div className="serving-controls">
          <strong>Порции</strong>
          <IconButton
            label="Меньше порций"
            disabled={servings === 1}
            onClick={() => setServings(servings - 1)}
          >
            <span>−</span>
          </IconButton>
          <span aria-live="polite">{servings}</span>
          <IconButton
            label="Больше порций"
            disabled={servings === 12}
            onClick={() => setServings(servings + 1)}
          >
            <Plus size={16} />
          </IconButton>
        </div>
        <h3>Ингредиенты</h3>
        <div className="ingredients">
          {r.ingredients.map(([name, quantity, unit]) => (
            <div key={name}>
              <span>{name}</span>
              <strong>
                {Math.round(((quantity * servings) / r.servings) * 10) / 10}{" "}
                {unit}
              </strong>
            </div>
          ))}
        </div>
        <h3>Готовим шаг за шагом</h3>
        <ol className="recipe-steps">
          {r.steps.map((s, i) => (
            <li key={s}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <p>{s}</p>
            </li>
          ))}
        </ol>
        <p className="field-help">
          Пищевая ценность приблизительна и зависит от продуктов. Для дробного
          количества яиц взбейте яйцо и отмерьте нужную долю.
        </p>
        <div className="form-grid">
          <label>
            Дата
            <input
              type="date"
              value={date}
              required
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Приём пищи
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value as typeof slot)}
            >
              <option value="breakfast">Завтрак</option>
              <option value="lunch">Обед</option>
              <option value="dinner">Ужин</option>
            </select>
          </label>
        </div>
        <div className="button-row">
          <button
            className="btn primary"
            disabled={!date}
            onClick={() => {
              update((s) => ({
                ...s,
                meals: [...s.meals, { id: uid(), date, recipeId: r.id, slot }],
              }));
              toast("Рецепт добавлен в меню");
            }}
          >
            <Plus size={16} /> В меню
          </button>
          <button
            className="btn"
            aria-pressed={state.favorites.includes(r.id)}
            onClick={() =>
              update((s) => ({
                ...s,
                favorites: s.favorites.includes(r.id)
                  ? s.favorites.filter((id) => id !== r.id)
                  : [...s.favorites, r.id],
              }))
            }
          >
            <Heart
              size={16}
              fill={state.favorites.includes(r.id) ? "currentColor" : "none"}
            />
            {state.favorites.includes(r.id) ? "В избранном" : "В избранное"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
