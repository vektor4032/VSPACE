import { useState } from "react";
import { WellbeingChart } from "../components/WellbeingChart";
import {
  Orbit,
  Check,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Sparkles,
  Flame,
  CheckCheck,
} from "lucide-react";
import { shiftDate, habitStreak } from "../data";
import { useApp, fmt } from "../context";
import { IconButton, Empty, PageHeading, SectionHead } from "../components/ui";

export function Insights() {
  const { state, today } = useApp();
  const [period, setPeriod] = useState(7);
  const [end, setEnd] = useState(today);
  const days = Array.from({ length: period }, (_, i) =>
    shiftDate(end, i - period + 1),
  );
  const done = state.tasks.filter(
    (t) => t.completedAt && days.includes(t.completedAt),
  ).length;
  const habitMarks = state.habits.reduce(
    (a, h) => a + days.filter((d) => (h.entries[d] || 0) >= h.target).length,
    0,
  );
  const checkins = days.map((d) => state.checkins[d]).filter(Boolean);
  const avg = (key: "sleep" | "energy" | "mood") =>
    checkins.length
      ? (checkins.reduce((a, c) => a + c[key], 0) / checkins.length).toFixed(1)
      : "—";
  const chart = days.map((d) => ({
    date: d,
    tasks: state.tasks.filter((t) => t.completedAt === d && t.done).length,
    habits: state.habits.filter((h) => (h.entries[d] || 0) >= h.target).length,
  }));
  const max = Math.max(1, ...chart.map((x) => x.tasks + x.habits));
  const any = done + habitMarks > 0;
  return (
    <>
      <PageHeading
        eyebrow="PROGRESS, NOT PERFECTION"
        title="Увидеть свой путь."
        description="Здесь только твои данные. Каждый маленький шаг имеет значение."
      />
      <div className="toolbar">
        <div className="segmented">
          <button
            className={period === 7 ? "active" : ""}
            onClick={() => setPeriod(7)}
          >
            Неделя
          </button>
          <button
            className={period === 30 ? "active" : ""}
            onClick={() => setPeriod(30)}
          >
            30 дней
          </button>
        </div>
        <div className="date-controls">
          <IconButton
            label="Предыдущий период"
            onClick={() => setEnd(shiftDate(end, -period))}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <span>
            {fmt(days[0])} — {fmt(end)}
          </span>
          <IconButton
            label="Следующий период"
            disabled={end >= today}
            onClick={() =>
              setEnd(
                shiftDate(end, period) > today ? today : shiftDate(end, period),
              )
            }
          >
            <ChevronRight size={18} />
          </IconButton>
        </div>
      </div>
      <div className="insight-stats">
        {[
          { label: "Задач выполнено", value: done, icon: CheckCheck },
          { label: "Ритуалов завершено", value: habitMarks, icon: Orbit },
          { label: "Средний сон, ч", value: avg("sleep"), icon: Moon },
          { label: "Энергия / 5", value: avg("energy"), icon: Sun },
        ].map((x) => (
          <div className="panel metric" key={x.label}>
            <x.icon size={21} />
            <strong>{x.value}</strong>
            <span>{x.label}</span>
          </div>
        ))}
      </div>
      <section className="panel chart-panel">
        <SectionHead
          index="01"
          title="Твоя активность"
          action={
            <div className="chart-legend">
              <span>
                <i /> Задачи
              </span>
              <span>
                <i /> Привычки
              </span>
            </div>
          }
        />
        {any ? (
          <>
            <div
              className="bar-chart"
              role="img"
              aria-label={`Активность за ${period} дней: ${done} задач, ${habitMarks} привычек.`}
            >
              {chart.map((c, i) => (
                <div
                  className="bar-column"
                  key={c.date}
                  title={`${fmt(c.date)}: ${c.tasks} задач, ${c.habits} привычек`}
                >
                  <div className="bar-space">
                    <div
                      className="chart-bar habit-bar"
                      style={{ height: `${(c.habits / max) * 100}%` }}
                    />
                    <div
                      className="chart-bar"
                      style={{ height: `${(c.tasks / max) * 100}%` }}
                    />
                  </div>
                  <span>
                    {period === 7
                      ? fmt(c.date, { weekday: "short" })
                      : i % 5 === 0
                        ? fmt(c.date, { day: "numeric" })
                        : "·"}
                  </span>
                </div>
              ))}
            </div>
            <details className="chart-data">
              <summary>Данные графика текстом</summary>
              {chart.map((c) => (
                <p key={c.date}>
                  {fmt(c.date)}: {c.tasks} задач, {c.habits} привычек
                </p>
              ))}
            </details>
          </>
        ) : (
          <Empty
            title="История ещё впереди"
            description="Отметьте привычку или выполните задачу. Здесь появится ваша динамика."
          />
        )}
      </section>
      <WellbeingChart days={days} />
      <div className="home-columns">
        <section className="panel">
          <SectionHead index="03" title="Ритм привычек" />
          {state.habits.length ? (
            state.habits.map((h) => {
              const count = days.filter(
                (d) => (h.entries[d] || 0) >= h.target,
              ).length;
              return (
                <div className="habit-insight" key={h.id}>
                  <div>
                    <strong>{h.title}</strong>
                    <span>
                      {count} / {period} дней
                    </span>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${(count / period) * 100}%` }} />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="muted">
              Создайте привычки, чтобы отслеживать регулярность.
            </p>
          )}
        </section>
        <section className="panel achievements">
          <SectionHead index="04" title="Твои маленькие победы" />
          <div className={state.tasks.some((t) => t.done) ? "earned" : ""}>
            <CheckCheck />
            <span>
              Первый шаг<small>Выполнить первую задачу</small>
            </span>
            {state.tasks.some((t) => t.done) && <Check size={17} />}
          </div>
          <div
            className={
              state.habits.some((h) => habitStreak(h, today) >= 7)
                ? "earned"
                : ""
            }
          >
            <Flame />
            <span>
              Своя орбита<small>7 дней подряд с одной привычкой</small>
            </span>
            {state.habits.some((h) => habitStreak(h, today) >= 7) && (
              <Check size={17} />
            )}
          </div>
          <div
            className={
              state.projects.some((p) => p.status === "done") ? "earned" : ""
            }
          >
            <Sparkles />
            <span>
              От идеи к реальности<small>Завершить первый проект</small>
            </span>
            {state.projects.some((p) => p.status === "done") && (
              <Check size={17} />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
