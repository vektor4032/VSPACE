import { dateParam, hashParam } from "../features/navigation";
import { useState, useEffect } from "react";
import { Plus, Droplets, Pencil } from "lucide-react";
import { useApp } from "../context";
import { uid } from "../data";
import { Modal, Empty, SectionHead } from "../components/ui";
import { DateNav, Metric, DeleteButton, Trend } from "./ui";
import { nutritionStats, dateRange } from "./stats";
import type { FoodEntry } from "./schema";
const slots = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
};
const nutrientLabels = {
  calories: "Калории, ккал",
  protein: "Белки, г",
  fat: "Жиры, г",
  carbs: "Углеводы, г",
};
export function Nutrition() {
  const { state, update, today, toast, go } = useApp();
  const [date, setDate] = useState(() => dateParam(today));
  useEffect(() => {
    const handler = () => setDate(dateParam(today));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [today]);
  const [edit, setEdit] = useState<FoodEntry | null>();
  const [targetsOpen, setTargetsOpen] = useState(false);
  const entries = state.life.foodLog.filter((e) => e.date === date);
  const stats = nutritionStats(entries);
  const targets = state.life.nutritionTargets;
  const water = state.life.water[date] || 0;
  function waterChange(delta: number) {
    update((s) => ({
      ...s,
      life: {
        ...s.life,
        water: {
          ...s.life.water,
          [date]: Math.max(
            0,
            Math.min(20000, (s.life.water[date] || 0) + delta),
          ),
        },
      },
    }));
  }
  return (
    <>
      <div className="life-section-intro">
        <div>
          <span className="eyebrow">FOOD & FEELING</span>
          <h2>Питание с вниманием.</h2>
          <p>Что было на тарелке, сколько воды и как складывается день.</p>
        </div>
        <button className="btn primary" onClick={() => setEdit(null)}>
          <Plus size={17} /> Записать приём пищи
        </button>
      </div>
      <div className="toolbar">
        <DateNav date={date} onChange={setDate} max={today} />
        <button className="btn" onClick={() => setTargetsOpen(true)}>
          Мои ориентиры
        </button>
        <button className="text-link" onClick={() => go("food")}>
          Открыть рецепты ↗
        </button>
      </div>
      <div className="life-metrics">
        {(Object.keys(nutrientLabels) as (keyof typeof nutrientLabels)[]).map(
          (key) => (
            <Metric
              key={key}
              label={nutrientLabels[key]}
              value={
                stats[key].known ? Math.round(stats[key].total * 10) / 10 : "—"
              }
              note={`${stats[key].known} из ${entries.length} записей с данными${targets[key] !== null ? ` · ориентир ${targets[key]}` : ""}`}
            />
          ),
        )}
      </div>
      <div className="life-two">
        <section className="panel hydration-panel">
          <SectionHead index="01" title="Вода за день" />
          <div className="water-count">
            <Droplets />
            <strong>
              {(water / 1000).toLocaleString("ru-RU", {
                maximumFractionDigits: 2,
              })}
              <small>л</small>
            </strong>
            {targets.waterMl !== null && (
              <span>
                из {(targets.waterMl / 1000).toLocaleString("ru-RU")} л
              </span>
            )}
          </div>
          {targets.waterMl !== null && (
            <div className="progress-track">
              <span
                style={{
                  width: `${Math.min(100, (water / targets.waterMl) * 100)}%`,
                }}
              />
            </div>
          )}
          <div className="button-row">
            <button
              className="btn"
              disabled={water === 0}
              onClick={() => waterChange(-250)}
            >
              − 250 мл
            </button>
            <button
              className="btn primary"
              disabled={water === 20000}
              onClick={() => waterChange(250)}
            >
              + 250 мл
            </button>
          </div>
          <p className="field-help">
            Точный объём в миллилитрах. Личные привычки со стаканами ведутся
            отдельно.
          </p>
        </section>
        <section className="panel">
          <SectionHead index="02" title="Вода за неделю" />
          <Trend
            label="Вода за семь дней в миллилитрах"
            unit="мл"
            values={dateRange(date, 7).map((d) => ({
              date: d,
              value: state.life.water[d] ?? null,
            }))}
          />
        </section>
      </div>
      <section className="panel food-diary">
        <SectionHead index="03" title="Мой дневник питания" />
        {entries.length ? (
          Object.entries(slots).map(([slot, label]) => (
            <div className="food-log-group" key={slot}>
              <h3>{label}</h3>
              {entries.filter((e) => e.slot === slot).length ? (
                entries
                  .filter((e) => e.slot === slot)
                  .map((e) => (
                    <div className="food-log-row" key={e.id}>
                      <button onClick={() => setEdit(e)}>
                        <strong>{e.title}</strong>
                        <small>
                          {e.grams !== null ? `${e.grams} г · ` : ""}
                          {e.calories === null
                            ? "Калории не указаны"
                            : `${e.estimated ? "≈ " : ""}${e.calories} ккал`}
                        </small>
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`Изменить блюдо ${e.title}`}
                        onClick={() => setEdit(e)}
                      >
                        <Pencil size={15} />
                      </button>
                      <DeleteButton
                        title={e.title}
                        onDelete={() =>
                          update((s) => ({
                            ...s,
                            life: {
                              ...s.life,
                              foodLog: s.life.foodLog.filter(
                                (x) => x.id !== e.id,
                              ),
                            },
                          }))
                        }
                      />
                    </div>
                  ))
              ) : (
                <span className="muted">Пока нет записей</span>
              )}
            </div>
          ))
        ) : (
          <Empty
            title="Что было вкусного?"
            description="Записывайте съеденные блюда вручную или добавьте порцию из библиотеки рецептов."
            action={
              <button className="btn" onClick={() => setEdit(null)}>
                <Plus size={16} /> Первая запись
              </button>
            }
          />
        )}
        <p className="field-help">
          КБЖУ вводятся для всей записанной порции. Пустые поля не считаются
          нулём. Значения из рецептов приблизительны.
        </p>
      </section>
      {edit !== undefined && (
        <Modal
          title={edit ? "Изменить блюдо" : "Что было на тарелке?"}
          onClose={() => setEdit(undefined)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const nullable = (key: string) =>
                String(f.get(key) || "").trim() === ""
                  ? null
                  : Number(f.get(key));
              const title = String(f.get("title")).trim();
              if (!title) return;
              const entry: FoodEntry = {
                id: edit?.id || uid(),
                date: String(f.get("date")),
                title,
                slot: f.get("slot") as FoodEntry["slot"],
                grams: nullable("grams"),
                calories: nullable("calories"),
                protein: nullable("protein"),
                fat: nullable("fat"),
                carbs: nullable("carbs"),
                estimated: f.get("estimated") === "on",
              };
              update((s) => ({
                ...s,
                life: {
                  ...s.life,
                  foodLog: edit
                    ? s.life.foodLog.map((x) => (x.id === edit.id ? entry : x))
                    : [...s.life.foodLog, entry],
                },
              }));
              setEdit(undefined);
              toast("Приём пищи сохранён");
            }}
          >
            <label>
              Блюдо
              <input
                name="title"
                required
                maxLength={300}
                defaultValue={edit?.title}
                placeholder="Например, омлет с овощами"
              />
            </label>
            <div className="form-grid">
              <label>
                Дата
                <input
                  type="date"
                  name="date"
                  defaultValue={edit?.date || date}
                  max={today}
                  required
                />
              </label>
              <label>
                Приём пищи
                <select name="slot" defaultValue={edit?.slot || "breakfast"}>
                  {Object.entries(slots).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Размер порции, г · необязательно
              <input
                type="number"
                name="grams"
                min="1"
                max="20000"
                step="0.1"
                defaultValue={edit?.grams ?? ""}
              />
            </label>
            <div className="form-grid">
              {Object.entries(nutrientLabels).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    name={key}
                    type="number"
                    min="0"
                    max={key === "calories" ? 20000 : 2000}
                    step="0.1"
                    defaultValue={
                      edit?.[key as keyof typeof nutrientLabels] ?? ""
                    }
                    placeholder="Если известно"
                  />
                </label>
              ))}
            </div>
            <label className="checklist-item">
              <input
                type="checkbox"
                name="estimated"
                defaultChecked={edit?.estimated ?? true}
              />
              <span>Приблизительные значения</span>
            </label>
            <button className="btn primary">Сохранить блюдо</button>
          </form>
        </Modal>
      )}
      {targetsOpen && (
        <Modal
          title="Мои ориентиры питания"
          onClose={() => setTargetsOpen(false)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const n = (key: string) =>
                String(f.get(key) || "").trim() === ""
                  ? null
                  : Number(f.get(key));
              update((s) => ({
                ...s,
                life: {
                  ...s.life,
                  nutritionTargets: {
                    calories: n("calories"),
                    protein: n("protein"),
                    fat: n("fat"),
                    carbs: n("carbs"),
                    waterMl: n("waterMl"),
                  },
                },
              }));
              setTargetsOpen(false);
            }}
          >
            <p className="field-help">
              Все поля необязательны. Укажите собственные ориентиры, если
              пользуетесь ими; приложение не назначает нормы и диеты.
            </p>
            <div className="form-grid">
              {Object.entries(nutrientLabels).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    name={key}
                    type="number"
                    min={key === "calories" ? 1 : 0}
                    max={key === "calories" ? 20000 : 2000}
                    step="0.1"
                    defaultValue={
                      targets[key as keyof typeof nutrientLabels] ?? ""
                    }
                  />
                </label>
              ))}
            </div>
            <label>
              Вода, мл
              <input
                type="number"
                min="1"
                max="20000"
                name="waterMl"
                defaultValue={targets.waterMl ?? ""}
              />
            </label>
            <button className="btn primary">Сохранить ориентиры</button>
          </form>
        </Modal>
      )}
    </>
  );
}
