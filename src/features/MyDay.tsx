import { useApp, fmt, habitIcons } from "../context";
import { PageHeading, Ring } from "../components/ui";
import { TaskRow } from "../components/Tasks";
import { recipes, uid } from "../data";
import { challengeProgress, rubles } from "../life/stats";
import { openQuick } from "./QuickCreate";
import { servesOn } from "./shopping";
const mealSlots = {
  Завтрак: "breakfast",
  Обед: "lunch",
  Ужин: "dinner",
} as const;
export function MyDay() {
  const { state, update, today, go, toast } = useApp();
  const mood = state.life.journal[today]?.mood ?? state.checkins[today]?.mood;
  const tasks = state.tasks.filter((t) => t.date === today);
  const active = state.life.goals.filter(
    (g) => g.start <= today && challengeProgress(g, today).end >= today,
  );
  const goals = active.filter((g) =>
    challengeProgress(g, today).plannedDays.includes(today),
  );
  const habitDone = state.habits.filter(
    (h) => (h.entries[today] || 0) >= h.target,
  ).length;
  const total = tasks.length + state.habits.length + goals.length;
  const done =
    tasks.filter((t) => t.done).length +
    habitDone +
    goals.filter((g) => g.dailyEntries[today]).length;
  const library = [...recipes, ...state.savedRecipes];
  const planned = [
    ...state.features.batches
      .filter((b) => servesOn(b, today))
      .map((b) => ({
        id: b.id,
        recipe: b.recipe,
        slot: mealSlots[b.recipe.category],
        label:
          b.date === today ? "Сегодня готовим" : `Партия от ${fmt(b.date)}`,
      })),
    ...state.meals
      .filter((m) => m.date === today)
      .map((m) => ({
        id: m.id,
        recipe: library.find((r) => r.id === m.recipeId),
        slot: m.slot,
        label: { breakfast: "Завтрак", lunch: "Обед", dinner: "Ужин" }[m.slot],
      })),
  ];
  return (
    <>
      <PageHeading
        eyebrow="ONE DAY / YOUR OWN RHYTHM"
        title="Мой день."
        description={`${fmt(today, { weekday: "long", day: "numeric", month: "long" })}. Всё важное — в одном месте.`}
        action={
          <button className="btn primary" onClick={() => openQuick()}>
            + Быстрая запись
          </button>
        }
      />
      <section className="panel day-intro">
        <Ring value={total ? (done / total) * 100 : 0} size={100} />
        <div>
          <h2>
            {total && done === total
              ? "На сегодня всё отмечено ✳"
              : "Маленькими шагами к своему."}
          </h2>
          <p>
            {done} / {total} действий · задачи, привычки и дни челленджей
          </p>
        </div>
      </section>
      <div className="life-grid day-grid">
        <section className="panel feature-card">
          <div className="life-row">
            <h3>Задачи на сегодня</h3>
            <button className="text-link" onClick={() => openQuick("task")}>
              + Задача
            </button>
          </div>
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
          {!tasks.length && (
            <p className="field-help">Пока нет задач. Можно начать с одной.</p>
          )}
          <button className="text-link" onClick={() => go("planner")}>
            Открыть планер ↗
          </button>
        </section>
        <section className="panel feature-card">
          <div className="life-row">
            <h3>Привычки</h3>
            <button className="text-link" onClick={() => go("habits")}>
              Настроить ↗
            </button>
          </div>
          {state.habits.map((h) => {
            const Icon = habitIcons[h.icon];
            const value = h.entries[today] || 0;
            return (
              <button
                key={h.id}
                className={`day-habit ${value >= h.target ? "is-complete" : ""}`}
                aria-label={`${h.title}: ${value} из ${h.target}`}
                onClick={() =>
                  update((s) => ({
                    ...s,
                    habits: s.habits.map((x) =>
                      x.id === h.id
                        ? {
                            ...x,
                            entries: {
                              ...x.entries,
                              [today]:
                                (x.entries[today] || 0) >= x.target
                                  ? 0
                                  : (x.entries[today] || 0) + 1,
                            },
                          }
                        : x,
                    ),
                  }))
                }
              >
                <Icon size={18} />
                <span>{h.title}</span>
                <strong>
                  {value} / {h.target} {h.unit}
                </strong>
              </button>
            );
          })}
          {!state.habits.length && (
            <p className="field-help">Добавь посильные ежедневные привычки.</p>
          )}
        </section>
        <section className="panel feature-card">
          <h3>Челленджи сегодня</h3>
          {active.map((g) => {
            const p = challengeProgress(g, today);
            const rest = !p.plannedDays.includes(today);
            return (
              <label key={g.id} className="day-challenge">
                <input
                  type="checkbox"
                  aria-label={`Сегодня: ${g.title}`}
                  checked={!!g.dailyEntries[today]}
                  disabled={rest}
                  onChange={() =>
                    update((s) => ({
                      ...s,
                      life: {
                        ...s.life,
                        goals: s.life.goals.map((x) =>
                          x.id === g.id
                            ? {
                                ...x,
                                dailyEntries: {
                                  ...x.dailyEntries,
                                  [today]: !x.dailyEntries[today],
                                },
                              }
                            : x,
                        ),
                      },
                    }))
                  }
                />
                <span>
                  {g.title}
                  <small>
                    {rest
                      ? "Сегодня отдых"
                      : `${p.done} / ${p.total} дней · ${Math.round(p.percent)}%`}
                  </small>
                </span>
              </label>
            );
          })}
          {!active.length && (
            <p className="field-help">Здесь появятся активные челленджи.</p>
          )}
          <a className="text-link" href="#life?tab=goals">
            Все челленджи ↗
          </a>
        </section>
        <section className="panel feature-card">
          <h3>Как я сегодня?</h3>
          <div className="day-feeling">
            <strong>{mood !== undefined ? `${mood} / 5` : "—"}</strong>
            <span>Настроение</span>
          </div>
          {state.life.journal[today]?.tinyStep && (
            <p className="life-note">
              Мой бережный шаг: {state.life.journal[today].tinyStep}
            </p>
          )}
          <div className="button-row wrap">
            <button className="btn" onClick={() => openQuick("journal")}>
              {state.life.journal[today]
                ? "Изменить дневник"
                : "Записать настроение"}
            </button>
            <button className="text-link" onClick={() => openQuick("thought")}>
              Выгрузить мысль
            </button>
          </div>
        </section>
        <section className="panel feature-card">
          <h3>Что сегодня на столе</h3>
          {planned.map((p) => (
            <div className="feature-list-row" key={p.id}>
              <div>
                <strong>{p.recipe?.title || "Рецепт удалён"}</strong>
                <small>{p.label}</small>
              </div>
              <button
                className="btn"
                disabled={!p.recipe}
                onClick={() => {
                  const r = p.recipe;
                  if (!r) return;
                  update((s) => ({
                    ...s,
                    life: {
                      ...s.life,
                      foodLog: [
                        ...s.life.foodLog,
                        {
                          id: uid(),
                          date: today,
                          slot: p.slot,
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
                    "Одна порция записана в дневник; её можно уточнить в питании",
                  );
                }}
              >
                Записать порцию
              </button>
            </div>
          ))}
          {!planned.length && (
            <p className="field-help">
              Выбери рецепты на неделю в разделе «Рецепты».
            </p>
          )}
          <div className="button-row wrap">
            <a className="text-link" href="#food?view=plan">
              Меню и покупки ↗
            </a>
            <button className="btn" onClick={() => openQuick("food")}>
              Записать другое блюдо
            </button>
          </div>
        </section>
        <section className="panel feature-card">
          <h3>Вода и маленькие записи</h3>
          <div className="day-water">
            <strong>
              {((state.life.water[today] || 0) / 1000).toLocaleString("ru-RU")}{" "}
              л
            </strong>
            <button
              className="btn primary"
              disabled={(state.life.water[today] || 0) >= 20000}
              onClick={() =>
                update((s) => ({
                  ...s,
                  life: {
                    ...s.life,
                    water: {
                      ...s.life.water,
                      [today]: Math.min(
                        20000,
                        (s.life.water[today] || 0) + 250,
                      ),
                    },
                  },
                }))
              }
            >
              + 250 мл
            </button>
          </div>
          <p className="field-help">
            Расходы сегодня:{" "}
            {rubles(
              state.life.transactions
                .filter((t) => t.date === today && t.type === "expense")
                .reduce((a, t) => a + t.amountMinor, 0),
            )}
          </p>
          <div className="button-row wrap">
            <button className="btn" onClick={() => openQuick("expense")}>
              Записать расход
            </button>
            <a className="text-link" href="#life?tab=week">
              Итоги недели ↗
            </a>
            <button className="text-link" onClick={() => go("settings")}>
              Напоминания ↗
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
