import { useState } from "react";
import { useApp, fmt } from "../context";
import { shiftDate } from "../data";
import { mondayOf, rubles, challengeProgress } from "../life/stats";
import { Metric, Trend } from "../life/ui";
export function WeeklyReview() {
  const { state, today } = useApp();
  const [start, setStart] = useState(mondayOf(today));
  const end = shiftDate(start, 6);

  const inWeek = (d: string) => d >= start && d <= end && d <= today;
  const previousStart = shiftDate(start, -7),
    previousEnd = shiftDate(start, -1);
  const moodSource = { ...state.checkins, ...state.life.journal };
  const moods = Object.entries(moodSource).filter(([d]) => inWeek(d));
  const prevMoods = Object.entries(moodSource).filter(
    ([d]) => d >= previousStart && d <= previousEnd && d <= today,
  );
  const average = (entries: typeof moods) =>
    entries.length
      ? entries.reduce((s, [, v]) => s + v.mood, 0) / entries.length
      : null;
  const avg = average(moods),
    oldAvg = average(prevMoods);
  const expenses = state.life.transactions.filter(
    (t) => t.type === "expense" && inWeek(t.date),
  );
  const categories = new Map<string, number>();
  expenses.forEach((t) =>
    categories.set(
      t.category,
      (categories.get(t.category) || 0) + t.amountMinor,
    ),
  );
  const leading = [...categories].sort((a, b) => b[1] - a[1]);
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
  const tasks = state.tasks.filter(
    (t) => t.done && t.completedAt && inWeek(t.completedAt),
  ).length;
  const habits = state.habits.reduce(
    (sum, h) =>
      sum +
      days.filter((d) => d <= today && (h.entries[d] || 0) >= h.target).length,
    0,
  );
  const challenges = state.life.goals
    .map((g) => {
      const p = challengeProgress(g, today);
      const planned = p.plannedDays.filter(inWeek);
      return {
        g,
        done: planned.filter((d) => g.dailyEntries[d]).length,
        total: planned.length,
      };
    })
    .filter((x) => x.total);
  const totalPlanned = challenges.reduce((s, x) => s + x.total, 0),
    totalDone = challenges.reduce((s, x) => s + x.done, 0);
  const week = state.life.weekPlans[start];
  return (
    <section className="panel feature-card weekly-review">
      <div className="toolbar">
        <div>
          <span className="eyebrow">NOTICE / REFLECT / ADJUST</span>
          <h2>Итоги недели</h2>
          <p className="field-help">
            {fmt(start)} — {fmt(end)}. Считаются только внесённые данные до
            сегодняшнего дня.
          </p>
        </div>
        <label>
          Неделя для итогов
          <input
            type="date"
            value={start}
            onChange={(e) =>
              e.target.value && setStart(mondayOf(e.target.value))
            }
          />
        </label>
      </div>
      <div className="life-metrics">
        <Metric label="Задач завершено" value={tasks} />
        <Metric label="Дневных целей привычек" value={habits} />
        <Metric
          label="Челленджи"
          value={`${totalDone} / ${totalPlanned}`}
          note="Отметки / запланированные дни"
        />
        <Metric
          label="Расходы недели"
          value={rubles(expenses.reduce((s, t) => s + t.amountMinor, 0))}
        />
      </div>
      <div className="life-grid">
        <div>
          <h3>Настроение</h3>
          <p>
            {avg === null
              ? "Нет отметок настроения"
              : `${avg.toFixed(1)} / 5 · ${moods.length} записей`}
            {avg !== null && oldAvg !== null
              ? ` · изменение среднего ${avg - oldAvg >= 0 ? "+" : ""}${(avg - oldAvg).toFixed(1)} к прошлой неделе`
              : ""}
          </p>
          <Trend
            max={5}
            label="Настроение выбранной недели"
            values={days.map((date) => ({
              date,
              value:
                date <= today
                  ? (state.life.journal[date]?.mood ??
                    state.checkins[date]?.mood ??
                    null)
                  : null,
            }))}
          />
          <p className="field-help">
            Количество записей в неделях может различаться. Изменение среднего
            не объясняет причины состояния.
          </p>
        </div>
        <div>
          <h3>Что забрало бюджет</h3>
          {leading.map(([name, sum]) => (
            <div className="feature-list-row" key={name}>
              <span>{name}</span>
              <strong>{rubles(sum)}</strong>
            </div>
          ))}
          {!leading.length && (
            <p className="field-help">Расходы за эту неделю не внесены.</p>
          )}
          <h3>Ориентир на следующую неделю</h3>
          <p className="life-note">
            {week?.next ||
              "Выбери один посильный приоритет и запиши его в «Моей неделе»."}
          </p>
          {week?.wins && <p className="life-note">Получилось: {week.wins}</p>}
        </div>
      </div>
    </section>
  );
}
