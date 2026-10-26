import { useState } from "react";
import { Plus, ArrowUpRight, Activity } from "lucide-react";
import { useApp, fmt } from "../context";
import { Modal } from "../components/ui";
import { DateNav, Metric, Trend, DeleteButton } from "./ui";
import {
  financeStats,
  rubles,
  periodSummary,
  challengeProgress,
  dateRange,
  mondayOf,
} from "./stats";
import { quoteOfDay, posters } from "./Inspiration";
export type LifeTab =
  | "overview"
  | "week"
  | "goals"
  | "psychology"
  | "balance"
  | "nutrition"
  | "finance"
  | "inspiration";
export function Overview({ open }: { open: (t: LifeTab) => void }) {
  const { state, today } = useApp();
  const [period, setPeriod] = useState(7);
  const summary = periodSummary(state, today, period);
  const month = financeStats(state.life.transactions, today.slice(0, 7));
  const daily = quoteOfDay(today);
  const poster = posters.find((p) => p.id === state.life.inspiration.poster);
  const week = state.life.weekPlans[mondayOf(today)];
  return (
    <>
      <div className="life-overview-intro">
        <div>
          <span className="eyebrow">ТВОЙ РИТМ / ПОСЛЕДНИЕ {period} ДНЕЙ</span>
          <h2>Замечать маленькие изменения.</h2>
          <p>Планируй посильное. Отмечай сделанное. Оставляй место для себя.</p>
        </div>
        <div className="button-row wrap">
          <label className="life-period">
            Период обзора
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
            >
              {[7, 21, 30, 90].map((n) => (
                <option value={n} key={n}>
                  {n} дней
                </option>
              ))}
            </select>
          </label>
          <button className="btn primary" onClick={() => open("week")}>
            Открыть мою неделю <ArrowUpRight size={17} />
          </button>
        </div>
      </div>
      <div className="life-metrics">
        <Metric
          label="Выполнено задач"
          value={summary.done}
          note={`За последние ${period} дней`}
        />
        <Metric
          label="Отметок привычек"
          value={summary.habits}
          note="Дней с достигнутой дневной целью"
        />
        <Metric
          label="Настроение"
          value={summary.mood === null ? "—" : `${summary.mood.toFixed(1)} / 5`}
          note={`${summary.journalCount} записей в дневнике`}
        />
        <Metric
          label="Движение"
          value={`${summary.workoutMinutes} мин`}
          note="По внесённым тренировкам"
        />
      </div>
      <div className="life-grid">
        <section className="panel life-card">
          <div className="life-row">
            <h3>Главное на эту неделю</h3>
            <button className="text-link" onClick={() => open("week")}>
              К плану ↗
            </button>
          </div>
          {week?.focus && <p className="life-note">{week.focus}</p>}
          {week?.priorities.length ? (
            <ul className="life-priorities">
              {week.priorities.map((p) => (
                <li className={p.done ? "is-done" : ""} key={p.id}>
                  {p.done ? "✓" : "○"} {p.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="field-help">
              Выбери до пяти приоритетов, чтобы не распыляться.
            </p>
          )}
        </section>
        <section className="panel life-card">
          <div className="life-row">
            <h3>Мои цели</h3>
            <button className="text-link" onClick={() => open("goals")}>
              Все цели ↗
            </button>
          </div>
          {state.life.goals.slice(0, 3).map((g) => {
            const p = challengeProgress(g, today);
            return (
              <button
                className="life-goal-link"
                key={g.id}
                onClick={() => open("goals")}
              >
                <span>
                  {g.title}
                  <small>
                    {p.done} / {p.total} дней · до {fmt(p.end)}
                  </small>
                </span>
                <strong>{Math.round(p.percent)}%</strong>
                <span className="life-progress-track">
                  <i style={{ width: `${p.percent}%` }} />
                </span>
              </button>
            );
          })}
          {!state.life.goals.length && (
            <p className="field-help">
              Чего хочется достичь за 21 или 90 дней? Начни с одной цели.
            </p>
          )}
        </section>
        <section className="panel life-card">
          <div className="life-row">
            <h3>Эмоциональный ритм</h3>
            <button className="text-link" onClick={() => open("psychology")}>
              В дневник ↗
            </button>
          </div>
          <Trend
            label={`Настроение за ${period} дней`}
            max={5}
            unit="из 5"
            values={summary.days.map((date) => ({
              date,
              value: state.life.journal[date]?.mood ?? null,
            }))}
          />
          <p className="field-help">
            Пропущенные дни остаются пустыми. Это наблюдение за собой, без
            оценки и диагнозов.
          </p>
        </section>
        <section className="panel life-card">
          <div className="life-row">
            <h3>Финансы месяца</h3>
            <button className="text-link" onClick={() => open("finance")}>
              К операциям ↗
            </button>
          </div>
          <div className="life-inline-metrics">
            <div>
              <small>Доход</small>
              <strong>{rubles(month.income)}</strong>
            </div>
            <div>
              <small>Расход</small>
              <strong>{rubles(month.expense)}</strong>
            </div>
            <div>
              <small>Разница</small>
              <strong>{rubles(month.balance)}</strong>
            </div>
          </div>
          <p className="field-help">
            {month.records.length} операций · учитываются только внесённые
            записи, без подключения к банку.
          </p>
        </section>
      </div>
      <ActivityLog />
      <div className="life-grid">
        <section className="panel daily-quote">
          <span className="eyebrow">СЛОВА НА СЕГОДНЯ</span>
          <blockquote>{daily.text}</blockquote>
          <button className="text-link" onClick={() => open("inspiration")}>
            Ещё немного вдохновения ↗
          </button>
        </section>
        {poster ? (
          <button
            className="overview-poster"
            onClick={() => open("inspiration")}
          >
            <img
              src={`${import.meta.env.BASE_URL}inspiration/${poster.id}.svg`}
              alt={poster.caption}
              width="600"
              height="700"
            />
          </button>
        ) : (
          <section className="panel life-card life-poster-placeholder">
            <span>✳</span>
            <h3>Место для вдохновения</h3>
            <p className="field-help">
              Выбери визуальное напоминание, которое поддерживает тебя.
            </p>
            <button className="btn" onClick={() => open("inspiration")}>
              Выбрать карточку
            </button>
          </section>
        )}
      </div>
    </>
  );
}
function ActivityLog() {
  const { state, update, today, toast } = useApp();
  const [date, setDate] = useState(today);
  const [edit, setEdit] = useState(false);
  const entry = state.life.activity[date];
  const week = dateRange(date, 7);
  return (
    <section className="panel life-card">
      <div className="toolbar">
        <div>
          <h3>
            <Activity size={18} /> Движение и самочувствие
          </h3>
          <p className="field-help">
            Ручные записи: шаги, минуты тренировок и вес по желанию.
          </p>
        </div>
        <div className="button-row">
          <DateNav date={date} max={today} onChange={setDate} />
          <button className="btn" onClick={() => setEdit(true)}>
            <Plus size={16} />
            {entry ? "Изменить активность" : "Записать активность"}
          </button>
          {entry && (
            <DeleteButton
              title={`Активность за ${fmt(date)}`}
              onDelete={() =>
                update((s) => {
                  const activity = { ...s.life.activity };
                  delete activity[date];
                  return { ...s, life: { ...s.life, activity } };
                })
              }
            />
          )}
        </div>
      </div>
      <div className="life-inline-metrics">
        <div>
          <small>Шаги</small>
          <strong>{entry?.steps?.toLocaleString("ru-RU") ?? "—"}</strong>
        </div>
        <div>
          <small>Тренировка</small>
          <strong>
            {entry?.workoutMinutes === null ||
            entry?.workoutMinutes === undefined
              ? "—"
              : `${entry.workoutMinutes} мин`}
          </strong>
        </div>
        <div>
          <small>Вес</small>
          <strong>
            {entry?.weightKg === null || entry?.weightKg === undefined
              ? "—"
              : `${entry.weightKg} кг`}
          </strong>
        </div>
      </div>
      <Trend
        label="Минуты тренировок за 7 дней"
        unit="мин"
        values={week.map((d) => ({
          date: d,
          value: state.life.activity[d]?.workoutMinutes ?? null,
        }))}
      />
      {edit && (
        <Modal title="Моя активность" onClose={() => setEdit(false)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const read = (k: string) =>
                String(f.get(k)).trim() === "" ? null : Number(f.get(k));
              update((s) => ({
                ...s,
                life: {
                  ...s.life,
                  activity: {
                    ...s.life.activity,
                    [date]: {
                      steps: read("steps"),
                      workoutMinutes: read("workoutMinutes"),
                      weightKg: read("weightKg"),
                    },
                  },
                },
              }));
              toast("Активность сохранена");
              setEdit(false);
            }}
          >
            <p>{fmt(date)} · все поля необязательны</p>
            <label>
              Шаги
              <input
                name="steps"
                type="number"
                min="0"
                max="200000"
                step="1"
                defaultValue={entry?.steps ?? ""}
              />
            </label>
            <label>
              Тренировка, минут
              <input
                name="workoutMinutes"
                type="number"
                min="0"
                max="1440"
                step="1"
                defaultValue={entry?.workoutMinutes ?? ""}
              />
            </label>
            <label>
              Вес, кг
              <input
                name="weightKg"
                type="number"
                min="20"
                max="500"
                step="0.1"
                defaultValue={entry?.weightKg ?? ""}
              />
            </label>
            <button className="btn primary">Сохранить активность</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
