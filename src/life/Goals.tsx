import { useState } from "react";
import type { FormEvent } from "react";
import { Plus, Check, ArrowUpRight } from "lucide-react";
import { useApp, fmt } from "../context";
import { uid } from "../data";
import { Modal, Empty, Ring } from "../components/ui";
import { areas } from "./schema";
import type { Goal } from "./schema";
import { areaLabels, goalProgress, dateRange } from "./stats";
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
            Выбери цель, разбей на шаги и наблюдай за результатом.
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
            const days = dateRange(
              today < g.start ? g.start : today > p.end ? p.end : today,
              Math.max(0, p.elapsed),
            );
            const linked = state.habits.filter((h) =>
              g.habitIds.includes(h.id),
            );
            return (
              <article className="panel goal-card" key={g.id}>
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
                <h3>{g.title}</h3>
                <div className="goal-progress">
                  <Ring value={p.percent} size={86} />
                  <div>
                    <strong>
                      {p.done} / {p.total} шагов
                    </strong>
                    <p className="field-help">
                      {!p.total
                        ? "Добавь шаги для расчёта прогресса."
                        : `${Math.round(p.percent)}% выполнено`}
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
          description="Создай свою первую цель. Прогресс считается по выполненным шагам, а не по прошедшим дням."
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
    };
    next.steps = next.steps.map((step) => ({
      ...step,
      title: step.title.trim(),
    }));
    if (
      !next.title ||
      next.steps.some((step) => !step.title) ||
      next.steps.length > 100
    ) {
      toast("Укажи название цели и каждого шага (не более 100 шагов)");
      return;
    }
    update((s) => ({
      ...s,
      life: {
        ...s.life,
        goals: goal
          ? s.life.goals.map((g) => (g.id === goal.id ? next : g))
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
            Шаги одинаково влияют на процент выполнения.
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
