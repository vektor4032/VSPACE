import { ImageField } from "../features/ImageField";
import { useState } from "react";
import type { FormEvent } from "react";
import { Plus, Check, ArrowUpRight } from "lucide-react";
import { useApp, fmt } from "../context";
import { uid } from "../data";
import { Modal, Empty, Ring } from "../components/ui";
import { areas } from "./schema";
import type { Goal } from "./schema";
import {
  areaLabels,
  goalProgress,
  challengeProgress,
  dateRange,
} from "./stats";
import { DeleteButton } from "./ui";
export function Goals() {
  const { state, update, today } = useApp();
  const [filter, setFilter] = useState<0 | 21 | 90>(0);
  const [edit, setEdit] = useState<Goal | null | undefined>(undefined);
  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Фокус на 21 и 90 дней</h2>
          <p className="field-help">
            Отмечай выполнение по дням и наблюдай за прогрессом челленджа.
          </p>
        </div>
        <button className="btn primary" onClick={() => setEdit(null)}>
          <Plus size={17} />
          Новая цель
        </button>
      </div>
      <div className="segmented">
        {([0, 21, 90] as const).map((n) => (
          <button
            key={n}
            aria-pressed={filter === n}
            className={filter === n ? "active" : ""}
            onClick={() => setFilter(n)}
          >
            {n === 0 ? "Все цели" : `${n} дней`}
          </button>
        ))}
      </div>
      <div className="life-grid">
        {state.life.goals
          .filter((g) => !filter || g.duration === filter)
          .map((g) => {
            const p = goalProgress(g, today);
            const daily = challengeProgress(g, today);
            const days = dateRange(
              today < g.start ? g.start : today > p.end ? p.end : today,
              Math.max(0, p.elapsed),
            );
            const linked = state.habits.filter((h) =>
              g.habitIds.includes(h.id),
            );
            return (
              <article
                className="panel goal-card"
                key={g.id}
                id={"goal-" + g.id}
                tabIndex={-1}
              >
                <div className="life-row">
                  <span className="tag">
                    {g.duration} дней · {areaLabels[g.area]}
                  </span>
                  <DeleteButton
                    title={g.title}
                    onDelete={() =>
                      update((s) => ({
                        ...s,
                        life: {
                          ...s.life,
                          goals: s.life.goals.filter((x) => x.id !== g.id),
                        },
                      }))
                    }
                  />
                </div>
                {g.cover && (
                  <img
                    className="goal-cover"
                    src={g.cover}
                    alt={g.title}
                    loading="lazy"
                  />
                )}
                <h3>{g.title}</h3>
                <div className="goal-progress">
                  <div
                    role="progressbar"
                    aria-label={`Прогресс челленджа: ${g.title}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(daily.percent)}
                    aria-valuetext={`${daily.done} из ${daily.total} дней выполнено`}
                  >
                    <Ring value={daily.percent} size={96} />
                  </div>
                  <div>
                    <strong>
                      {daily.done} / {daily.total} дней выполнено
                    </strong>
                    <p className="field-help">
                      {Math.round(daily.percent)}% челленджа
                    </p>
                  </div>
                </div>
                <p className="field-help">
                  {fmt(g.start)} — {fmt(p.end)} ·{" "}
                  {today < g.start
                    ? "Ещё не началась"
                    : today > p.end
                      ? "Период завершён"
                      : `Прошло ${p.elapsed} из ${g.duration} дней`}
                </p>
                {g.why && <p className="life-note">{g.why}</p>}
                <fieldset className="challenge-tracker">
                  <legend>Ежедневные отметки</legend>
                  <p className="field-help">
                    Отметь день, когда выполнила челлендж. Можно заполнить
                    прошедшие дни; будущие откроются по дате. Круг учитывает
                    только выбранные дни выполнения.
                  </p>
                  <div className="challenge-days">
                    {daily.days.map((date, index) => (
                      <label
                        key={date}
                        className={`challenge-day ${date === today ? "is-today" : ""} ${date > today ? "is-future" : ""} ${!daily.plannedDays.includes(date) ? "is-rest" : ""}`}
                      >
                        <span className="challenge-day-number">
                          День {index + 1}
                        </span>
                        <input
                          type="checkbox"
                          aria-label={`${g.title}: ${fmt(date, { day: "numeric", month: "long", year: "numeric" })}`}
                          checked={g.dailyEntries[date] === true}
                          disabled={
                            date > today || !daily.plannedDays.includes(date)
                          }
                          onChange={() =>
                            update((s) => ({
                              ...s,
                              life: {
                                ...s.life,
                                goals: s.life.goals.map((goal) =>
                                  goal.id === g.id
                                    ? {
                                        ...goal,
                                        dailyEntries: {
                                          ...goal.dailyEntries,
                                          [date]: !goal.dailyEntries[date],
                                        },
                                      }
                                    : goal,
                                ),
                              },
                            }))
                          }
                        />
                        <span>
                          {fmt(date, { day: "numeric", month: "short" })}
                        </span>
                        {!daily.plannedDays.includes(date) ? (
                          <small>Отдых</small>
                        ) : (
                          date === today && <small>Сегодня</small>
                        )}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {g.steps.length > 0 && (
                  <div className="goal-step-summary">
                    <h4>Шаги и этапы</h4>
                    <span>
                      {p.done} / {p.total} · {Math.round(p.percent)}% шагов
                    </span>
                  </div>
                )}
                <div className="life-checklist">
                  {g.steps.map((step) => (
                    <label key={step.id}>
                      <input
                        type="checkbox"
                        checked={step.done}
                        onChange={() =>
                          update((s) => ({
                            ...s,
                            life: {
                              ...s.life,
                              goals: s.life.goals.map((x) =>
                                x.id === g.id
                                  ? {
                                      ...x,
                                      steps: x.steps.map((t) =>
                                        t.id === step.id
                                          ? { ...t, done: !t.done }
                                          : t,
                                      ),
                                    }
                                  : x,
                              ),
                            },
                          }))
                        }
                      />
                      <span className={step.done ? "is-done" : ""}>
                        {step.title}
                      </span>
                    </label>
                  ))}
                </div>
                {linked.length > 0 && (
                  <div className="goal-habits">
                    <h4>Поддерживающие привычки</h4>
                    {linked.map((h) => (
                      <p key={h.id}>
                        {h.title}
                        <strong>
                          {
                            days.filter((d) => (h.entries[d] || 0) >= h.target)
                              .length
                          }{" "}
                          / {days.length} дней
                        </strong>
                      </p>
                    ))}
                  </div>
                )}
                {g.reward && <p className="life-note">✳ Награда: {g.reward}</p>}
                <button className="text-link" onClick={() => setEdit(g)}>
                  Изменить цель <ArrowUpRight size={16} />
                </button>
              </article>
            );
          })}
      </div>
      {!state.life.goals.filter((g) => !filter || g.duration === filter)
        .length && (
        <Empty
          title="Большое начинается с одного шага"
          description="Создай свою первую цель. Отмечай выполнение каждый день — круг покажет долю выполненных дней."
        />
      )}
      {edit !== undefined && (
        <GoalForm goal={edit || undefined} onClose={() => setEdit(undefined)} />
      )}
    </>
  );
}
function GoalForm({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { state, update, today, toast } = useApp();
  const [steps, setSteps] = useState(goal?.steps || []);
  const [draft, setDraft] = useState("");
  const [habits, setHabits] = useState(goal?.habitIds || []);
  const [weekdays, setWeekdays] = useState(
    goal?.weekdays || [0, 1, 2, 3, 4, 5, 6],
  );
  const [cover, setCover] = useState(goal?.cover || "");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next: Goal = {
      id: goal?.id || uid(),
      title: String(f.get("title")).trim(),
      area: f.get("area") as Goal["area"],
      start: String(f.get("start")),
      duration: Number(f.get("duration")) as 21 | 90,
      why: String(f.get("why")).trim(),
      reward: String(f.get("reward")).trim(),
      steps: draft.trim()
        ? [...steps, { id: uid(), title: draft.trim(), done: false }]
        : steps,
      habitIds: habits,
      dailyEntries: goal?.dailyEntries || {},
      weekdays,
      cover,
    };
    next.steps = next.steps.map((step) => ({
      ...step,
      title: step.title.trim(),
    }));
    if (
      !weekdays.length ||
      !next.title ||
      next.steps.some((step) => !step.title) ||
      next.steps.length > 100
    ) {
      toast(
        "Укажите название, хотя бы один день выполнения и названия шагов (до 100)",
      );
      return;
    }
    update((s) => ({
      ...s,
      life: {
        ...s.life,
        goals: goal
          ? s.life.goals.map((g) =>
              g.id === goal.id ? { ...next, dailyEntries: g.dailyEntries } : g,
            )
          : [...s.life.goals, next],
      },
    }));
    toast("Цель сохранена");
    onClose();
  }
  return (
    <Modal title={goal ? "Изменить цель" : "Новая цель"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Моя главная цель
          <input
            name="title"
            required
            maxLength={300}
            autoFocus
            defaultValue={goal?.title}
          />
        </label>
        <div className="form-grid">
          <label>
            Период
            <select name="duration" defaultValue={goal?.duration || 21}>
              <option value="21">21 день</option>
              <option value="90">90 дней</option>
            </select>
          </label>
          <label>
            Дата старта
            <input
              name="start"
              type="date"
              required
              defaultValue={goal?.start || today}
            />
          </label>
        </div>
        <fieldset className="life-fieldset">
          <legend>Дни выполнения</legend>
          <div className="weekday-options">
            {[
              [1, "Пн"],
              [2, "Вт"],
              [3, "Ср"],
              [4, "Чт"],
              [5, "Пт"],
              [6, "Сб"],
              [0, "Вс"],
            ].map(([day, label]) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={weekdays.includes(Number(day))}
                  onChange={() =>
                    setWeekdays(
                      weekdays.includes(Number(day))
                        ? weekdays.filter((d) => d !== Number(day))
                        : [...weekdays, Number(day)],
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <small className="field-help">
            Для зала 3 раза в неделю выберите три дня. Дни отдыха не снижают
            прогресс.
          </small>
        </fieldset>
        <ImageField value={cover} onChange={setCover} label="Обложка цели" />
        <label>
          Сфера
          <select name="area" defaultValue={goal?.area || "growth"}>
            {areas.map((a) => (
              <option key={a} value={a}>
                {areaLabels[a]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Зачем мне это?
          <textarea name="why" maxLength={5000} defaultValue={goal?.why} />
        </label>
        <fieldset className="life-fieldset">
          <legend>Конкретные шаги</legend>
          {steps.map((step) => (
            <div className="life-row" key={step.id}>
              <input
                aria-label="Название шага"
                required
                maxLength={300}
                value={step.title}
                onChange={(e) =>
                  setSteps(
                    steps.map((s) =>
                      s.id === step.id ? { ...s, title: e.target.value } : s,
                    ),
                  )
                }
              />
              <button
                className="icon-btn"
                type="button"
                aria-label={`Убрать шаг: ${step.title}`}
                onClick={() => setSteps(steps.filter((s) => s.id !== step.id))}
              >
                ×
              </button>
            </div>
          ))}
          <div className="life-row">
            <input
              aria-label="Новый шаг"
              placeholder="Например, составить план обучения"
              maxLength={300}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              aria-label="Добавить шаг"
              disabled={!draft.trim() || steps.length >= 99}
              onClick={() => {
                setSteps([
                  ...steps,
                  { id: uid(), title: draft.trim(), done: false },
                ]);
                setDraft("");
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          <small className="field-help">
            Шаги — отдельные этапы. Круг прогресса считается по ежедневным
            отметкам.
          </small>
        </fieldset>
        {state.habits.length > 0 && (
          <fieldset className="life-fieldset">
            <legend>Связать с привычками</legend>
            {state.habits.map((h) => (
              <label className="life-checkbox" key={h.id}>
                <input
                  type="checkbox"
                  checked={habits.includes(h.id)}
                  onChange={() =>
                    setHabits(
                      habits.includes(h.id)
                        ? habits.filter((id) => id !== h.id)
                        : [...habits, h.id],
                    )
                  }
                />
                {h.title}
              </label>
            ))}
          </fieldset>
        )}
        <label>
          Награда за путь
          <input name="reward" maxLength={500} defaultValue={goal?.reward} />
        </label>
        <button className="btn primary" type="submit">
          <Check size={16} />
          Сохранить цель
        </button>
      </form>
    </Modal>
  );
}
