import { useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  ShoppingBasket,
} from "lucide-react";
import { useApp, fmt } from "../context";
import { recipes, shiftDate, uid } from "../data";
import { mondayOf } from "../life/stats";
import { Modal, IconButton } from "../components/ui";
import { DeleteButton } from "../life/ui";
import { shoppingList, servesOn } from "./shopping";
import type { Batch } from "./schema";
export function downloadText(
  text: string,
  name: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function WeeklyMeals() {
  const { state, update, today, toast } = useApp();
  const [week, setWeek] = useState(mondayOf(today));
  const [edit, setEdit] = useState<Batch | null | undefined>();
  const [extra, setExtra] = useState("");
  const [viewing, setViewing] = useState<Batch | null>(null);
  const library = [...recipes, ...state.savedRecipes];
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(week, i));
  const plans = state.features.batches.filter(
    (b) => b.date >= week && b.date <= days[6],
  );
  const items = shoppingList(state.features.batches, week);
  const checks = state.features.shoppingChecks[week] || {};
  const extras = state.features.shoppingExtras.filter((x) => x.week === week);
  const done =
    items.filter((i) => checks[i.key]).length +
    extras.filter((x) => x.done).length;
  return (
    <section className="panel weekly-meals">
      <div className="toolbar">
        <div>
          <span className="eyebrow">COOK LESS / ENJOY MORE</span>
          <h2>Меню на неделю и покупки</h2>
          <p className="field-help">
            Планируй 2–3 готовки на неделю. Одна запись — одна приготовленная
            партия, даже если ешь её несколько дней.
          </p>
        </div>
        <button
          className="btn primary"
          disabled={state.features.batches.length >= 1000}
          onClick={() => setEdit(null)}
        >
          <Plus size={16} />
          Запланировать готовку
        </button>
      </div>
      <div className="toolbar">
        <div className="button-row">
          <IconButton
            label="Предыдущая неделя меню"
            onClick={() => setWeek(shiftDate(week, -7))}
          >
            <ChevronLeft size={17} />
          </IconButton>
          <label>
            Неделя меню
            <input
              type="date"
              value={week}
              onChange={(e) =>
                e.target.value && setWeek(mondayOf(e.target.value))
              }
            />
          </label>
          <IconButton
            label="Следующая неделя меню"
            onClick={() => setWeek(shiftDate(week, 7))}
          >
            <ChevronRight size={17} />
          </IconButton>
        </div>
        <button className="btn" onClick={() => setWeek(mondayOf(today))}>
          Текущая неделя
        </button>
      </div>
      <div className="batch-week">
        {days.map((day) => (
          <div className={day === today ? "is-today" : ""} key={day}>
            <h3>
              {fmt(day, { weekday: "short", day: "numeric", month: "short" })}
            </h3>
            {state.features.batches
              .filter((b) => servesOn(b, day))
              .map((b) => (
                <button
                  className="batch-day-meal"
                  key={b.id}
                  onClick={() => setViewing(b)}
                >
                  {b.recipe.title}
                  <small>
                    {b.date === day ? "Готовим" : `Партия от ${fmt(b.date)}`}
                  </small>
                </button>
              ))}
            {!state.features.batches.some((b) => servesOn(b, day)) && (
              <small className="field-help">Без плана</small>
            )}
          </div>
        ))}
      </div>
      <div className="batch-list">
        {plans.map((b) => (
          <article key={b.id}>
            <div>
              <strong>{b.recipe.title}</strong>
              <p className="field-help">
                Готовка {fmt(b.date)} · на {b.days} дн. · всего {b.servings}{" "}
                порций
              </p>
            </div>
            <button className="text-link" onClick={() => setViewing(b)}>
              Приготовление
            </button>
            <button className="text-link" onClick={() => setEdit(b)}>
              Изменить
            </button>
            <DeleteButton
              title={`Готовка: ${b.recipe.title}`}
              onDelete={() =>
                update((s) => ({
                  ...s,
                  features: {
                    ...s.features,
                    batches: s.features.batches.filter((x) => x.id !== b.id),
                  },
                }))
              }
            />
          </article>
        ))}
      </div>
      <div className="shopping-heading">
        <div>
          <h3>
            <ShoppingBasket size={19} /> Список покупок
          </h3>
          <p className="field-help">
            На готовку {fmt(week)} — {fmt(days[6])} · отмечено {done} из{" "}
            {items.length + extras.length}
          </p>
        </div>
        <button
          className="btn"
          disabled={!items.length && !extras.length}
          onClick={() =>
            downloadText(
              [
                `Покупки ${fmt(week)} — ${fmt(days[6])}`,
                ...items.map(
                  (i) =>
                    `${checks[i.key] ? "✓" : "□"} ${i.name}: ${i.amount === null ? i.notes.join("; ") : `${i.amount} ${i.unit}`}`,
                ),
                ...extras.map((e) => `${e.done ? "✓" : "□"} ${e.title}`),
              ].join("\n"),
              `vspace-shopping-${week}.txt`,
            )
          }
        >
          <Download size={16} />
          Скачать список
        </button>
      </div>
      <p className="field-help">
        Одинаковые продукты суммируются с учётом порций. Кг переводятся в г,
        литры — в мл. Граммы и миллилитры не смешиваются. Неизвестные количества
        нужно уточнить; отметка означает «куплено или есть дома».
      </p>
      <div className="shopping-items">
        {items.map((i) => (
          <label key={i.key} className={checks[i.key] ? "is-done" : ""}>
            <input
              type="checkbox"
              checked={checks[i.key] || false}
              aria-label={`Куплено: ${i.name}, ${i.amount === null ? "уточнить количество" : `${i.amount} ${i.unit}`}`}
              onChange={() =>
                update((s) => ({
                  ...s,
                  features: {
                    ...s.features,
                    shoppingChecks: {
                      ...s.features.shoppingChecks,
                      [week]: {
                        ...s.features.shoppingChecks[week],
                        [i.key]: !s.features.shoppingChecks[week]?.[i.key],
                      },
                    },
                  },
                }))
              }
            />
            <span>
              <strong>{i.name}</strong>
              <small>{i.recipes.join(" · ")}</small>
              {i.amount === null && <small>{i.notes.join("; ")}</small>}
            </span>
            <b>
              {i.amount === null
                ? "Уточнить"
                : `${i.amount.toLocaleString("ru-RU")} ${i.unit}`}
            </b>
          </label>
        ))}
        {extras.map((e) => (
          <div className="shopping-extra" key={e.id}>
            <label>
              <input
                type="checkbox"
                checked={e.done}
                onChange={() =>
                  update((s) => ({
                    ...s,
                    features: {
                      ...s.features,
                      shoppingExtras: s.features.shoppingExtras.map((x) =>
                        x.id === e.id ? { ...x, done: !x.done } : x,
                      ),
                    },
                  }))
                }
              />
              {e.title}
            </label>
            <IconButton
              label={`Убрать покупку: ${e.title}`}
              onClick={() =>
                update((s) => ({
                  ...s,
                  features: {
                    ...s.features,
                    shoppingExtras: s.features.shoppingExtras.filter(
                      (x) => x.id !== e.id,
                    ),
                  },
                }))
              }
            >
              ×
            </IconButton>
          </div>
        ))}
      </div>
      {!items.length && (
        <p className="field-help">
          Выбери рецепты для готовки — продукты появятся автоматически. Остатки
          партии с прошлой недели показаны в меню, но повторно в покупки не
          попадают.
        </p>
      )}
      <form
        className="life-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!extra.trim()) return;
          update((s) => ({
            ...s,
            features: {
              ...s.features,
              shoppingExtras: [
                ...s.features.shoppingExtras,
                { id: uid(), week, title: extra.trim(), done: false },
              ],
            },
          }));
          setExtra("");
        }}
      >
        <input
          aria-label="Добавить покупку вручную"
          placeholder="Ещё нужно купить…"
          maxLength={300}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
        />
        <button className="btn" disabled={!extra.trim()}>
          <Plus size={16} />
          Добавить
        </button>
      </form>
      {viewing && (
        <Modal title={viewing.recipe.title} onClose={() => setViewing(null)}>
          <div className="feature-card">
            <p>
              Ингредиенты на всю партию: {viewing.servings} порций. Шаги — из
              сохранённого рецепта.
            </p>
            <div className="ingredients">
              {shoppingList([viewing], mondayOf(viewing.date)).map((item) => (
                <div key={item.key}>
                  <span>{item.name}</span>
                  <strong>
                    {item.amount === null
                      ? item.notes.join("; ")
                      : `${item.amount.toLocaleString("ru-RU")} ${item.unit}`}
                  </strong>
                </div>
              ))}
            </div>
            <ol className="recipe-steps">
              {viewing.recipe.steps.map((step, i) => (
                <li key={i}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
            {viewing.recipe.sourceUrl && (
              <a
                className="text-link"
                href={viewing.recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть источник ↗
              </a>
            )}
            <button
              className="btn"
              onClick={() => {
                setEdit(viewing);
                setViewing(null);
              }}
            >
              Изменить готовку
            </button>
          </div>
        </Modal>
      )}
      {edit !== undefined && (
        <Modal
          title={edit ? "Изменить готовку" : "Готовка на несколько дней"}
          onClose={() => setEdit(undefined)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const recipe =
                library.find((r) => r.id === f.get("recipe")) || edit?.recipe;
              if (!recipe) return;
              const batch: Batch = {
                id: edit?.id || uid(),
                date: String(f.get("date")),
                days: Number(f.get("days")),
                servings: Number(f.get("servings")),
                baseServings: Number(f.get("base")),
                recipe: { ...recipe, cover: "" },
              };
              update((s) => ({
                ...s,
                features: {
                  ...s.features,
                  batches: edit
                    ? s.features.batches.map((b) =>
                        b.id === edit.id ? batch : b,
                      )
                    : [...s.features.batches, batch],
                },
              }));
              setWeek(mondayOf(batch.date));
              toast("Меню и список покупок обновлены");
              setEdit(undefined);
            }}
          >
            <label>
              Рецепт
              <select
                name="recipe"
                onChange={(e) => {
                  const chosen = library.find((r) => r.id === e.target.value);
                  const input = e.currentTarget.form?.elements.namedItem(
                    "base",
                  ) as HTMLInputElement | null;
                  if (input)
                    input.value = chosen?.servings
                      ? String(chosen.servings)
                      : "";
                }}
                defaultValue={edit?.recipe.id || library[0]?.id}
              >
                {edit && !library.some((r) => r.id === edit.recipe.id) && (
                  <option value={edit.recipe.id}>
                    {edit.recipe.title} · сохранённая партия
                  </option>
                )}
                {library.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Дата готовки
              <input
                type="date"
                name="date"
                required
                defaultValue={
                  edit?.date ||
                  (today >= week && today <= days[6] ? today : week)
                }
              />
            </label>
            <div className="form-grid">
              <label>
                На сколько дней
                <select name="days" defaultValue={edit?.days || 3}>
                  <option value="1">1 день</option>
                  <option value="2">2 дня</option>
                  <option value="3">3 дня</option>
                </select>
              </label>
              <label>
                Всего порций в партии
                <input
                  name="servings"
                  type="number"
                  required
                  min="1"
                  max="100"
                  defaultValue={edit?.servings || 6}
                />
              </label>
            </div>
            <label>
              На сколько порций исходный рецепт
              <input
                name="base"
                type="number"
                required
                min="1"
                max="100"
                defaultValue={edit?.baseServings || library[0]?.servings || ""}
              />
              <small className="field-help">
                Например: готовлю на двоих на 3 дня — всего 6 порций. Если
                исходный рецепт на 2 порции, продукты умножатся на 3. Проверь
                это число при выборе другого рецепта.
              </small>
            </label>

            <button className="btn primary">Сохранить готовку</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
