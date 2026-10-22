import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { localDate, shiftDate } from "../data";
import { useApp, fmt } from "../context";
import { IconButton, Empty, PageHeading } from "../components/ui";
import { OverdueTasks } from "../components/OverdueTasks";
import { TaskForm, TaskRow } from "../components/Tasks";

export function Planner() {
  const { state, update, today } = useApp();
  const [date, setDate] = useState(today);
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [filter, setFilter] = useState("all");
  const [add, setAdd] = useState(false);
  const d = new Date(date + "T12:00:00");
  const monday = shiftDate(date, -((d.getDay() + 6) % 7));
  const first = localDate(new Date(d.getFullYear(), d.getMonth(), 1));
  const gridStart = shiftDate(
    first,
    -((new Date(first + "T12:00:00").getDay() + 6) % 7),
  );
  const days = Array.from(
    { length: view === "month" ? 42 : view === "week" ? 7 : 1 },
    (_, i) =>
      view === "month"
        ? shiftDate(gridStart, i)
        : view === "week"
          ? shiftDate(monday, i)
          : date,
  );
  function move(n: number) {
    if (view === "month") {
      const next = new Date(d.getFullYear(), d.getMonth() + n, 1);
      setDate(localDate(next));
    } else setDate(shiftDate(date, n * (view === "week" ? 7 : 1)));
  }
  function drop(e: React.DragEvent, day: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    update((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, date: day } : t)),
    }));
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE TIME FOR WHAT MATTERS"
        title="Планы на орбите."
        description="Не успеть всё. Успеть важное."
        action={
          <button className="btn primary" onClick={() => setAdd(true)}>
            <Plus size={18} /> Новая задача
          </button>
        }
      />
      <div className="toolbar">
        <div className="segmented">
          {[
            ["day", "Сегодня"],
            ["week", "Неделя"],
            ["month", "Месяц"],
          ].map(([v, l]) => (
            <button
              className={view === v ? "active" : ""}
              key={v}
              onClick={() => {
                setView(v as typeof view);
                if (v === "day") setDate(today);
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="date-controls">
          <IconButton label="Предыдущий период" onClick={() => move(-1)}>
            <ChevronLeft size={18} />
          </IconButton>
          <button className="text-link" onClick={() => setDate(today)}>
            {view === "month"
              ? fmt(date, { month: "long", year: "numeric" })
              : fmt(date)}
          </button>
          <IconButton label="Следующий период" onClick={() => move(1)}>
            <ChevronRight size={18} />
          </IconButton>
        </div>
        <select
          aria-label="Фильтр задач"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Все задачи</option>
          <option value="open">Предстоящие</option>
          <option value="done">Выполненные</option>
          <option value="high">Высокий приоритет</option>
        </select>
      </div>
      <div className="planner-date-jump">
        <label htmlFor="planner-date">Перейти к дате</label>
        <input
          id="planner-date"
          aria-label="Выбрать дату планера"
          type="date"
          value={date}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
        />
      </div>
      <OverdueTasks />
      <div
        className={`calendar ${view === "day" ? "calendar-single" : `calendar-${view}`}`}
      >
        {days.map((day) => {
          const tasks = state.tasks.filter(
            (t) =>
              t.date === day &&
              (filter === "all" ||
                (filter === "done" && t.done) ||
                (filter === "open" && !t.done) ||
                (filter === "high" && t.priority === "high")),
          );
          return (
            <section
              key={day}
              className={`calendar-day ${day === today ? "is-today" : ""} ${day.slice(0, 7) !== date.slice(0, 7) && view === "month" ? "other-month" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => drop(e, day)}
            >
              <div className="calendar-date">
                <button
                  onClick={() => {
                    setDate(day);
                    setView("day");
                  }}
                >
                  <span>{fmt(day, { weekday: "short" })}</span>
                  <strong>{fmt(day, { day: "numeric" })}</strong>
                </button>
                <IconButton
                  label={`Добавить задачу на ${fmt(day)}`}
                  onClick={() => {
                    setDate(day);
                    setAdd(true);
                  }}
                >
                  <Plus size={15} />
                </IconButton>
              </div>
              {tasks.map((t) =>
                view === "month" ? (
                  <button
                    key={t.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", t.id)
                    }
                    className={`calendar-chip ${t.done ? "done" : ""}`}
                    onClick={() => {
                      setDate(day);
                      setView("day");
                    }}
                  >
                    <span className={`priority-dot ${t.priority}`} />
                    {t.title}
                  </button>
                ) : (
                  <TaskRow task={t} key={t.id} />
                ),
              )}
              {!tasks.length && view === "day" && (
                <Empty
                  title="Можно выдохнуть"
                  description="Здесь пока нет задач. Добавьте первую или выберите другую дату."
                  action={
                    <button className="btn" onClick={() => setAdd(true)}>
                      <Plus size={16} /> Добавить задачу
                    </button>
                  }
                />
              )}
            </section>
          );
        })}
      </div>
      {view !== "day" && (
        <p className="field-help">
          На компьютере задачи можно перетаскивать между днями. На телефоне
          измените дату через редактирование задачи.
        </p>
      )}
      {add && <TaskForm date={date} onClose={() => setAdd(false)} />}
    </>
  );
}
