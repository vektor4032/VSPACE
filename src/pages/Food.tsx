import { useState, useEffect, useRef } from "react";
import { ArrowUpRight, Plus, X, Search, Heart, Clock } from "lucide-react";
import { uid, recipes } from "../data";
import type { Recipe } from "../data";
import { RecipeForm } from "../recipes/RecipeForm";
import {
  searchOnlineRecipes,
  onlineQuery,
  webRecipeSearch,
} from "../recipes/online";
import { DeleteButton } from "../life/ui";
import { useApp } from "../context";
import {
  IconButton,
  Empty,
  Modal,
  PageHeading,
  SectionHead,
} from "../components/ui";

export function Food() {
  const { state, update, today, toast } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [favorite, setFavorite] = useState(false);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [date, setDate] = useState(today);
  const library = [...recipes, ...state.savedRecipes];
  const [mode, setMode] = useState<"library" | "saved" | "online">("library");
  const [form, setForm] = useState<Recipe | null | undefined>();
  const [results, setResults] = useState<Recipe[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [onlineError, setOnlineError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      const previous = controller.current;
      controller.current = null;
      previous?.abort();
    },
    [],
  );
  function resetSearch() {
    const previous = controller.current;
    controller.current = null;
    previous?.abort();
    setOnlineStatus("idle");
    setResults([]);
    setOnlineError("");
  }
  async function search() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setOnlineStatus("loading");
    setOnlineError("");
    setResults([]);
    const timer = setTimeout(() => current.abort(), 20000);
    try {
      const found = await searchOnlineRecipes(
        query,
        category === "Завтрак"
          ? "Завтрак"
          : category === "Ужин"
            ? "Ужин"
            : "Обед",
        current.signal,
      );
      if (controller.current !== current) return;
      setResults(found);
      setOnlineStatus("done");
    } catch (error) {
      if (controller.current !== current) return;
      setOnlineError(
        current.signal.aborted
          ? "Не удалось дождаться ответа каталога. Попробуйте ещё раз или откройте Яндекс."
          : error instanceof Error
            ? error instanceof TypeError
              ? "Не удаётся подключиться к каталогу. Проверьте интернет или воспользуйтесь Яндексом."
              : error.message
            : "Не удалось загрузить рецепты",
      );
      setOnlineStatus("error");
    } finally {
      clearTimeout(timer);
    }
  }
  const list = (
    mode === "online"
      ? results
      : mode === "saved"
        ? state.savedRecipes
        : library
  ).filter(
    (r) =>
      (mode === "online" || category === "Все" || r.category === category) &&
      (!favorite || state.favorites.includes(r.id)) &&
      (mode === "online" ||
        (r.title + " " + r.ingredients.map((i) => i[0]).join(" "))
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  function toggleFavorite(id: string) {
    const found = results.find((recipe) => recipe.id === id);
    if (
      found &&
      !library.some((recipe) => recipe.id === id) &&
      state.savedRecipes.length >= 500
    ) {
      toast(
        "В моей книге уже 500 рецептов. Удалите ненужные перед добавлением новых.",
      );
      return;
    }
    if (found && !library.some((recipe) => recipe.id === id))
      update((s) => ({
        ...s,
        savedRecipes: s.savedRecipes.some((recipe) => recipe.id === id)
          ? s.savedRecipes
          : [...s.savedRecipes, { ...found, savedAt: today }],
      }));
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
          <p>Своя книга рецептов и новые идеи из интернета.</p>
        </div>
        <div className="food-banner-art" aria-hidden="true">
          <span>🥑</span>
          <span>🍋</span>
          <span>✳</span>
        </div>
      </section>
      <div className="toolbar recipe-library-tools">
        <div className="segmented" aria-label="Источник рецептов">
          {[
            ["library", "Все рецепты"],
            ["saved", "Моя книга"],
            ["online", "Международный каталог"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={mode === value ? "active" : ""}
              aria-pressed={mode === value}
              onClick={() => {
                resetSearch();
                setMode(value as typeof mode);
                if (value === "online") {
                  setCategory(category === "Все" ? "Обед" : category);
                  setFavorite(false);
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => setForm(null)}>
          <Plus size={16} />
          Добавить рецепт
        </button>
      </div>
      <div className="toolbar">
        <div className="segmented">
          {(mode === "online"
            ? ["Завтрак", "Обед", "Ужин"]
            : ["Все", "Завтрак", "Обед", "Ужин"]
          ).map((c) => (
            <button
              className={category === c ? "active" : ""}
              key={c}
              onClick={() => {
                resetSearch();
                setCategory(c);
              }}
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
            maxLength={200}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                mode === "online" &&
                query.trim() &&
                onlineStatus !== "loading"
              ) {
                event.preventDefault();
                void search();
              }
            }}
            value={query}
            onChange={(e) => {
              resetSearch();
              setQuery(e.target.value);
            }}
          />
        </div>
      </div>
      <section className="panel recipe-discovery">
        <div>
          <h3>Найти новые идеи</h3>
          <p className="field-help">
            Введи блюдо или ингредиент в поиск выше. Русскоязычные рецепты можно
            найти в Яндексе и добавить в свою книгу со ссылкой на источник.
          </p>
        </div>
        <a
          className="btn"
          href={webRecipeSearch(query, category)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Найти в Яндексе <ArrowUpRight size={16} />
        </a>
      </section>
      {mode === "online" && (
        <section className="panel recipe-online-search">
          <div>
            <h3>Рецепты из TheMealDB</h3>
            <p className="field-help">
              Международный каталог на английском. Попробуй «курица», «рис» или
              название блюда на английском. Для незнакомого русского запроса
              воспользуйся Яндексом. Кнопки «Завтрак / Обед / Ужин» выбирают
              категорию сохранения, а не фильтруют каталог.
            </p>
            {query && onlineQuery(query) !== query.trim() && (
              <p className="field-help">
                Запрос в каталог: {onlineQuery(query)}
              </p>
            )}
          </div>
          <button
            className="btn primary"
            onClick={search}
            disabled={!query.trim() || onlineStatus === "loading"}
          >
            {onlineStatus === "loading" ? "Ищем рецепты…" : "Найти в каталоге"}
          </button>
          {onlineError && <p role="alert">{onlineError}</p>}
          {onlineStatus === "done" && (
            <p role="status">
              Найдено рецептов: {results.length}. Категорию сохранения можно
              изменить в своей книге.
            </p>
          )}
        </section>
      )}
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
                    <Clock size={14} />{" "}
                    {r.time === null ? "Время не указано" : `${r.time} мин`}
                  </span>
                  <span>
                    {r.calories === null
                      ? "Калории не указаны"
                      : `≈ ${r.calories} ккал / порция`}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Здесь пока пусто"
          description={
            mode === "online"
              ? onlineStatus === "loading"
                ? "Загружаем рецепты…"
                : onlineStatus === "done"
                  ? "Попробуйте другое название или ингредиент."
                  : "Введите запрос и нажмите «Найти в каталоге»."
              : mode === "saved"
                ? "Сохраняйте рецепты из каталога или добавляйте найденные в интернете."
                : "Измените поиск или фильтры."
          }
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
                  const r = library.find((x) => x.id === m.recipeId);
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
                {library.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
      {form !== undefined && (
        <RecipeForm
          recipe={form || undefined}
          onClose={() => setForm(undefined)}
          onSaved={(recipe) => {
            setSelected(recipe);
            setMode("saved");
            setQuery("");
            setFavorite(false);
            setCategory("Все");
          }}
        />
      )}
      {selected && (
        <RecipeModal
          key={selected.id}
          recipe={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setForm(selected);
            setSelected(null);
          }}
        />
      )}
    </>
  );
}

function RecipeModal({
  recipe: r,
  onClose,
  onEdit,
}: {
  recipe: Recipe;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { state, update, toast, today } = useApp();
  const [servings, setServings] = useState(r.servings || 1);
  const scalable =
    r.servings !== null && r.ingredients.every((i) => i[1] !== null);
  const personal = state.savedRecipes.some((recipe) => recipe.id === r.id);
  function ensureSaved() {
    if (
      !personal &&
      !recipes.some((recipe) => recipe.id === r.id) &&
      state.savedRecipes.length >= 500
    ) {
      toast(
        "В моей книге уже 500 рецептов. Удалите ненужные перед добавлением новых.",
      );
      return false;
    }
    if (!personal && !recipes.some((recipe) => recipe.id === r.id))
      update((s) => ({
        ...s,
        savedRecipes: s.savedRecipes.some((recipe) => recipe.id === r.id)
          ? s.savedRecipes
          : [...s.savedRecipes, { ...r, savedAt: today }],
      }));
    return true;
  }
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<"breakfast" | "lunch" | "dinner">("lunch");
  return (
    <Modal title={r.title} onClose={onClose}>
      <div className="recipe-detail">
        <div className="button-row">
          <span className="tag">
            <Clock size={14} />{" "}
            {r.time === null ? "Время не указано" : `${r.time} мин`}
          </span>
          <span className="tag">{r.category}</span>
          <span className="tag">
            {r.calories === null
              ? "Калории не указаны"
              : `≈ ${r.calories} ккал / порция`}
          </span>
        </div>
        {r.sourceUrl && (
          <a
            className="text-link"
            href={r.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Источник: {r.sourceName || new URL(r.sourceUrl).hostname}{" "}
            <ArrowUpRight size={15} />
          </a>
        )}
        {r.sourceName === "TheMealDB" && (
          <p className="field-help">
            Оригинал TheMealDB на английском. Время, порции и калории можно
            дополнить в своей книге.
          </p>
        )}
        <div className="button-row wrap">
          {!personal && !recipes.some((recipe) => recipe.id === r.id) && (
            <button
              className="btn primary"
              onClick={() => {
                if (!ensureSaved()) return;
                toast("Рецепт сохранён в моей книге");
              }}
            >
              Сохранить в мою книгу
            </button>
          )}
          {personal && (
            <>
              <button className="btn" onClick={onEdit}>
                Изменить рецепт
              </button>
              <DeleteButton
                title={r.title}
                onDelete={() => {
                  update((s) => ({
                    ...s,
                    savedRecipes: s.savedRecipes.filter(
                      (recipe) => recipe.id !== r.id,
                    ),
                    favorites: s.favorites.filter((id) => id !== r.id),
                    meals: s.meals.filter((meal) => meal.recipeId !== r.id),
                  }));
                  onClose();
                  toast("Рецепт удалён из моей книги и меню");
                }}
              />
            </>
          )}
        </div>
        {scalable ? (
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
        ) : (
          <p className="field-help">
            {r.servings
              ? `Ингредиенты на ${r.servings} порций.`
              : "Число порций не указано."}{" "}
            Количество сохранено как в источнике, без автоматического пересчёта.
          </p>
        )}
        <h3>Ингредиенты</h3>
        <div className="ingredients">
          {r.ingredients.map(([name, quantity, unit], index) => (
            <div key={index}>
              <span>{name}</span>
              <strong>
                {quantity === null
                  ? ""
                  : Math.round(
                      ((quantity * servings) / (r.servings || 1)) * 10,
                    ) / 10}{" "}
                {unit}
              </strong>
            </div>
          ))}
        </div>
        <h3>Готовим шаг за шагом</h3>
        <ol className="recipe-steps">
          {r.steps.map((s, i) => (
            <li key={i}>
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
              if (!ensureSaved()) return;
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
            disabled={!date || date > today}
            onClick={() => {
              if (!ensureSaved()) return;
              update((s) => ({
                ...s,
                life: {
                  ...s.life,
                  foodLog: [
                    ...s.life.foodLog,
                    {
                      id: uid(),
                      date,
                      slot,
                      title: r.title,
                      grams: null,
                      calories: r.calories,
                      protein: null,
                      fat: null,
                      carbs: null,
                      estimated: true,
                    },
                  ],
                },
              }));
              toast(
                r.servings === null
                  ? "Блюдо добавлено в дневник. Порцию и КБЖУ можно уточнить там."
                  : "В дневник питания добавлена 1 порция",
              );
            }}
          >
            <Plus size={16} />{" "}
            {r.servings === null ? "В дневник питания" : "В дневник: 1 порция"}
          </button>
          <button
            className="btn"
            aria-pressed={state.favorites.includes(r.id)}
            onClick={() => {
              if (!ensureSaved()) return;
              update((s) => ({
                ...s,
                favorites: s.favorites.includes(r.id)
                  ? s.favorites.filter((id) => id !== r.id)
                  : [...s.favorites, r.id],
              }));
            }}
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
