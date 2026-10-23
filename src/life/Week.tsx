import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import { useApp, fmt } from "../context";
import { shiftDate, uid } from "../data";
import type { LifeState } from "./schema";
import { mondayOf } from "./stats";
import { IconButton } from "../components/ui";
import { TaskForm, TaskRow } from "../components/Tasks";
const blank: LifeState["weekPlans"][string] = {
  priorities: [],
  focus: "",
  wins: "",
  energy: "",
  learned: "",
  remove: "",
  next: "",
  joy: "",
  reward: "",
};
export function Week() {
  const { state, update, today, toast, go } = useApp();
  const [start, setStart] = useState(mondayOf(today));
  const [addDate, setAddDate] = useState("");
  const [priority, setPriority] = useState("");
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
  const plan = state.life.weekPlans[start] || blank;
  const save = (fn: (p: typeof plan) => typeof plan) =>
    update((s) => ({
      ...s,
      life: {
        ...s.life,
        weekPlans: {
          ...s.life.weekPlans,
          [start]: fn(s.life.weekPlans[start] || structuredClone(blank)),
        },
      },
    }));
  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Моя неделя</h2>
          <p className="field-help">
            Планы, забота о себе и маленькие радости в одном месте.
          </p>
        </div>
        <div className="button-row">
          <IconButton
            label="Предыдущая неделя"
            onClick={() => setStart(shiftDate(start, -7))}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <label className="life-week-picker">
            Неделя с
            <input
              type="date"
              aria-label="Начало недели"
              value={start}
              onChange={(e) =>
                e.target.value && setStart(mondayOf(e.target.value))
              }
            />
          </label>
          <IconButton
            label="Следующая неделя"
            onClick={() => setStart(shiftDate(start, 7))}
          >
            <ChevronRight size={18} />
          </IconButton>
          <button className="btn" onClick={() => setStart(mondayOf(today))}>
            Эта неделя
          </button>
        </div>
      </div>
      <div className="week-days">
        {days.map((day) => (
          <section
            className={`panel week-day ${day === today ? "is-today" : ""}`}
            key={day}
          >
            <div className="life-row">
              <h3>
                {fmt(day, { weekday: "short", day: "numeric", month: "short" })}
              </h3>
              <IconButton
                label={`Добавить задачу на ${day}`}
                onClick={() => setAddDate(day)}
              >
                <Plus size={16} />
              </IconButton>
            </div>
            {state.tasks
              .filter((t) => t.date === day)
              .map((t) => (
                <TaskRow key={t.id} task={t} compact />
              ))}
            {!state.tasks.some((t) => t.date === day) && (
              <p className="field-help">Свободное место для планов</p>
            )}
          </section>
        ))}
      </div>
      <div className="life-grid">
        <section className="panel life-card">
          <h3>Пять приоритетов недели</h3>
          <div className="life-checklist">
            {plan.priorities.map((p) => (
              <div className="life-row" key={p.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={p.done}
                    onChange={() =>
                      save((w) => ({
                        ...w,
                        priorities: w.priorities.map((x) =>
                          x.id === p.id ? { ...x, done: !x.done } : x,
                        ),
                      }))
                    }
                  />
                  <span className={p.done ? "is-done" : ""}>{p.title}</span>
                </label>
                <IconButton
                  label={`Убрать приоритет: ${p.title}`}
                  onClick={() =>
                    save((w) => ({
                      ...w,
                      priorities: w.priorities.filter((x) => x.id !== p.id),
                    }))
                  }
                >
                  ×
                </IconButton>
              </div>
            ))}
          </div>
          <form
            className="life-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (priority.trim() && plan.priorities.length < 5) {
                save((w) => ({
                  ...w,
                  priorities: [
                    ...w.priorities,
                    { id: uid(), title: priority.trim(), done: false },
                  ],
                }));
                setPriority("");
              }
            }}
          >
            <input
              aria-label="Приоритет недели"
              maxLength={300}
              placeholder="Главное на эту неделю"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
            <button
              className="btn"
              disabled={!priority.trim() || plan.priorities.length >= 5}
            >
              <Plus size={16} />
              <span className="sr-only">Добавить приоритет</span>
            </button>
          </form>
          <p className="field-help">
            Приоритеты — ориентиры недели. Конкретные дела добавляй в дни выше.
          </p>
        </section>
        <section className="panel life-card">
          <h3>Важные даты и дедлайны</h3>
          {state.projects
            .filter((p) => p.deadline >= start && p.deadline <= days[6])
            .map((p) => (
              <button
                className="life-list-link"
                key={p.id}
                onClick={() => go("projects")}
              >
                <span>{p.title}</span>
                <small>{fmt(p.deadline)}</small>
              </button>
            ))}
          {state.tasks
            .filter(
              (t) =>
                t.priority === "high" && t.date >= start && t.date <= days[6],
            )
            .map((t) => (
              <TaskRow task={t} key={t.id} compact />
            ))}
          {!state.projects.some(
            (p) => p.deadline >= start && p.deadline <= days[6],
          ) &&
            !state.tasks.some(
              (t) =>
                t.priority === "high" && t.date >= start && t.date <= days[6],
            ) && (
              <p className="field-help">
                Здесь появятся дедлайны проектов и задачи с высоким приоритетом.
              </p>
            )}
        </section>
      </div>
      <section className="panel life-card">
        <div className="life-row">
          <h3>Трекер заботы о себе</h3>
          <button className="text-link" onClick={() => go("habits")}>
            Настроить привычки ↗
          </button>
        </div>
        {state.habits.length ? (
          <div className="weekly-habits">
            {state.habits.map((h) => (
              <div className="weekly-habit" key={h.id}>
                <span>
                  {h.title}
                  <small>
                    {h.target} {h.unit} в день
                  </small>
                </span>
                {days.map((d) => {
                  const done = (h.entries[d] || 0) >= h.target;
                  return (
                    <button
                      key={d}
                      disabled={d > today}
                      className={done ? "checked" : ""}
                      aria-label={`${h.title}, ${fmt(d)}: ${done ? "выполнено" : "отметить"}`}
                      aria-pressed={done}
                      onClick={() =>
                        update((s) => ({
                          ...s,
                          habits: s.habits.map((x) =>
                            x.id === h.id
                              ? {
                                  ...x,
                                  entries: {
                                    ...x.entries,
                                    [d]: done ? 0 : x.target,
                                  },
                                }
                              : x,
                          ),
                        }))
                      }
                    >
                      <small>{fmt(d, { weekday: "short" })}</small>
                      <span>
                        {done ? <Check size={16} /> : Number(d.slice(-2))}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <p className="field-help">
            Добавь привычки — здесь появятся те же отметки, что и в разделе
            «Привычки».
          </p>
        )}
      </section>
      <WeekReview
        key={start}
        plan={plan}
        onSave={(notes) => {
          save((w) => ({ ...w, ...notes }));
          toast("Неделя сохранена");
        }}
      />
      {addDate && <TaskForm date={addDate} onClose={() => setAddDate("")} />}
    </>
  );
}
function WeekReview({
  plan,
  onSave,
}: {
  plan: LifeState["weekPlans"][string];
  onSave: (n: Omit<typeof plan, "priorities">) => void;
}) {
  const [notes, setNotes] = useState(plan);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setNotes(plan);
  }, [plan, dirty]);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    onSave(
      Object.fromEntries(
        fields.map(([key]) => [key, String(f.get(key)).trim()]),
      ) as Omit<typeof plan, "priorities">,
    );
    setDirty(false);
  }
  return (
    <form className="panel life-card form" onSubmit={submit}>
      <h3>Фокус, радости и итоги недели</h3>
      <div className="life-grid">
        {fields.map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea
              name={key}
              maxLength={key === "reward" ? 500 : 5000}
              value={notes[key]}
              onChange={(e) => {
                setNotes({ ...notes, [key]: e.target.value });
                setDirty(true);
              }}
            />
          </label>
        ))}
      </div>
      {dirty && (
        <p className="field-help" role="status">
          Есть несохранённые изменения в итогах недели.
        </p>
      )}
      <button className="btn primary" type="submit">
        Сохранить неделю <Check size={16} />
      </button>
    </form>
  );
}
const fields = [
  ["focus", "На чём хочу сосредоточиться?"],
  ["joy", "Маленькие радости"],
  ["wins", "Что получилось?"],
  ["energy", "Что дало энергию?"],
  ["learned", "Что я заметила и чему научилась?"],
  ["remove", "Что уберу или сокращу?"],
  ["next", "Фокус на следующую неделю"],
  ["reward", "Моя награда за неделю"],
] as const;
