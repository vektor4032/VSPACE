import { ArrowRight, Clock } from "lucide-react";
import { useApp, fmt } from "../context";
import { TaskRow } from "./Tasks";

export function OverdueTasks() {
  const { state, update, today, toast } = useApp();
  const tasks = state.tasks
    .filter((t) => !t.done && t.date < today)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!tasks.length) return null;
  return (
    <details className="overdue-panel" open>
      <summary>
        <Clock size={17} />
        <span>Остались с прошлых дней</span>
        <strong>{tasks.length}</strong>
      </summary>
      <p>
        Можно завершить сейчас или найти для них новое место в сегодняшнем дне.
      </p>
      <div className="overdue-list">
        {tasks.map((t) => (
          <div className="overdue-item" key={t.id}>
            <div className="overdue-task">
              <span className="overdue-date">
                {fmt(t.date, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <TaskRow task={t} />
            </div>
            <button
              className="btn"
              aria-label={`На сегодня: ${t.title}`}
              onClick={() => {
                update((s) => ({
                  ...s,
                  tasks: s.tasks.map((task) =>
                    task.id === t.id ? { ...task, date: today } : task,
                  ),
                }));
                toast("Задача перенесена на сегодня");
              }}
            >
              На сегодня <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}
