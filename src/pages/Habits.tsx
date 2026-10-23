import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowUpRight,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Trash2,
  Pencil,
} from "lucide-react";
import { shiftDate, uid, habitStreak } from "../data";
import type { Habit } from "../data";
import { useApp, habitIcons, fmt } from "../context";
import { IconButton, Empty, Modal, Ring, PageHeading } from "../components/ui";

export function HabitForm({
  habit,
  onClose,
}: {
  habit?: Habit;
  onClose: () => void;
}) {
  const { update, toast } = useApp();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const h: Habit = {
      id: habit?.id || uid(),
      title: String(f.get("title")).trim(),
      icon: f.get("icon") as Habit["icon"],
      target: Number(f.get("target")),
      unit: String(f.get("unit")),
      entries: habit?.entries || {},
    };
    if (!h.title) return;
    update((s) => ({
      ...s,
      habits: habit
        ? s.habits.map((x) => (x.id === habit.id ? h : x))
        : [...s.habits, h],
    }));
    toast("Привычка сохранена");
    onClose();
  }
  return (
    <Modal
      title={habit ? "Настроить привычку" : "Новый маленький ритуал"}
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <label>
          Название
          <input
            name="title"
            required
            maxLength={100}
            defaultValue={habit?.title}
            placeholder="Например, стакан воды"
          />
        </label>
        <div className="form-grid">
          <label>
            Цель в день
            <input
              type="number"
              name="target"
              min="1"
              max="100"
              required
              defaultValue={habit?.target || 1}
            />
          </label>
          <label>
            Единица измерения
            <input
              name="unit"
              maxLength={30}
              defaultValue={habit?.unit || "раз"}
              placeholder="стаканов, минут, раз"
            />
          </label>
        </div>
        <label>
          Символ
          <select name="icon" defaultValue={habit?.icon || "sparkles"}>
            {[
              ["water", "Вода"],
              ["moon", "Сон"],
              ["sun", "Энергия"],
              ["heart", "Забота"],
              ["activity", "Активность"],
              ["leaf", "Питание"],
              ["sparkles", "Личное"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <p className="field-help">
          История хранится по датам. Изменение цели применяется и к прошлым
          дням.
        </p>
        <button className="btn primary" type="submit">
          Сохранить привычку <Check size={17} />
        </button>
      </form>
    </Modal>
  );
}

export function Habits() {
  const { state, update, today, toast } = useApp();
  const [date, setDate] = useState(today);
  const [edit, setEdit] = useState<Habit | null>();
  const [remove, setRemove] = useState<Habit | null>(null);
  const [period, setPeriod] = useState(7);
  const days = Array.from({ length: period }, (_, i) =>
    shiftDate(date, i - period + 1),
  );
  const completed = state.habits.filter(
    (h) => (h.entries[date] || 0) >= h.target,
  ).length;
  const checkin = state.checkins[date];
  const [checkinOpen, setCheckinOpen] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="SMALL STEPS. BIG SHIFTS."
        title="Твой ежедневный ритм."
        description="Забота о себе — это практика, а не финишная черта."
        action={
          <button className="btn primary" onClick={() => setEdit(null)}>
            <Plus size={18} /> Новая привычка
          </button>
        }
      />
      <div className="habit-summary">
        <div>
          <span className="eyebrow">DAILY ORBIT</span>
          <h2>
            {completed}
            <span> / {state.habits.length}</span>
          </h2>
          <p>ритуалов выполнено</p>
        </div>
        <Ring
          value={
            state.habits.length ? (completed / state.habits.length) * 100 : 0
          }
          size={110}
        />
        <div className="summary-quote">
          «Ты становишься тем,
          <br />
          что повторяешь.»<span>ЧУТЬ-ЧУТЬ, КАЖДЫЙ ДЕНЬ ↗</span>
        </div>
      </div>
      <div className="toolbar">
        <div className="date-controls">
          <IconButton
            label="Предыдущий день"
            onClick={() => setDate(shiftDate(date, -1))}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <input
            aria-label="Дата привычек"
            type="date"
            max={today}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <IconButton
            label="Следующий день"
            disabled={date >= today}
            onClick={() => setDate(shiftDate(date, 1))}
          >
            <ChevronRight size={18} />
          </IconButton>
        </div>
        <div className="segmented">
          <button
            className={period === 7 ? "active" : ""}
            onClick={() => setPeriod(7)}
          >
            7 дней
          </button>
          <button
            className={period === 30 ? "active" : ""}
            onClick={() => setPeriod(30)}
          >
            30 дней
          </button>
        </div>
      </div>
      {state.habits.length ? (
        <div className="habit-grid">
          {state.habits.map((h) => {
            const Icon = habitIcons[h.icon];
            const value = h.entries[date] || 0;
            const successes = days.filter(
              (day) => (h.entries[day] || 0) >= h.target,
            ).length;
            return (
              <article className="habit-card panel" key={h.id}>
                <div className="habit-card-top">
                  <div
                    className={`habit-icon ${value >= h.target ? "filled" : ""}`}
                  >
                    <Icon size={22} />
                  </div>
                  <div className="button-row">
                    <IconButton
                      label={`Редактировать ${h.title}`}
                      onClick={() => setEdit(h)}
                    >
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      label={`Удалить привычку ${h.title}`}
                      onClick={() => setRemove(h)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
                <h3>{h.title}</h3>
                <div className="habit-count">
                  <strong>
                    {value}
                    <small> / {h.target}</small>
                  </strong>
                  <span>{h.unit}</span>
                </div>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${Math.min((value / h.target) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div className="habit-controls">
                  <button
                    className="btn"
                    disabled={value === 0}
                    aria-label={`Уменьшить ${h.title}`}
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        habits: s.habits.map((x) =>
                          x.id === h.id
                            ? {
                                ...x,
                                entries: {
                                  ...x.entries,
                                  [date]: Math.max(0, value - 1),
                                },
                              }
                            : x,
                        ),
                      }))
                    }
                  >
                    −
                  </button>
                  <button
                    className={`btn ${value >= h.target ? "" : "primary"}`}
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        habits: s.habits.map((x) =>
                          x.id === h.id
                            ? {
                                ...x,
                                entries: {
                                  ...x.entries,
                                  [date]:
                                    value >= h.target
                                      ? 0
                                      : Math.min(value + 1, h.target),
                                },
                              }
                            : x,
                        ),
                      }))
                    }
                  >
                    {value >= h.target ? (
                      <>
                        <Check size={16} /> Готово · сбросить
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> Отметить
                      </>
                    )}
                  </button>
                </div>
                <div className={`heatmap heatmap-${period}`}>
                  {days.map((day) => (
                    <button
                      key={day}
                      title={`${fmt(day)}: ${h.entries[day] || 0} / ${h.target}`}
                      aria-label={`${h.title}, ${fmt(day)}: ${h.entries[day] || 0} из ${h.target}`}
                      className={
                        (h.entries[day] || 0) >= h.target
                          ? "filled"
                          : (h.entries[day] || 0) > 0
                            ? "partial"
                            : ""
                      }
                      onClick={() => setDate(day)}
                    >
                      {period === 7 ? fmt(day, { weekday: "narrow" }) : ""}
                    </button>
                  ))}
                </div>
                <div className="habit-meta">
                  <span>
                    <Flame size={14} /> {habitStreak(h, today)} дн. подряд
                  </span>
                  <span>
                    {successes} / {period} дней
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Всё начинается с одного ритуала"
          description="Вода, движение, чтение или забота о себе. Выберите привычку, которую хочется повторять."
          action={
            <button className="btn primary" onClick={() => setEdit(null)}>
              <Plus size={17} /> Создать привычку
            </button>
          }
        />
      )}
      <section className="checkin panel">
        <div>
          <span className="eyebrow">CHECK IN WITH YOURSELF</span>
          <h2>Как ты сегодня?</h2>
          <p>
            {checkin
              ? `Сон: ${checkin.sleep} ч · Энергия: ${checkin.energy}/5 · Настроение: ${checkin.mood}/5`
              : "Сон, энергия и настроение — без оценок и ожиданий."}
          </p>
        </div>
        <button className="btn" onClick={() => setCheckinOpen(true)}>
          {checkin ? "Изменить запись" : "Отметить состояние"}{" "}
          <ArrowUpRight size={17} />
        </button>
      </section>
      {edit !== undefined && (
        <HabitForm
          habit={edit || undefined}
          onClose={() => setEdit(undefined)}
        />
      )}{" "}
      {remove && (
        <Modal title="Удалить привычку?" onClose={() => setRemove(null)}>
          <p>Привычка «{remove.title}» и её история будут удалены.</p>
          <div className="button-row">
            <button className="btn" onClick={() => setRemove(null)}>
              Отмена
            </button>
            <button
              className="btn danger"
              onClick={() => {
                update((s) => ({
                  ...s,
                  habits: s.habits.filter((h) => h.id !== remove.id),
                }));
                setRemove(null);
                toast("Привычка удалена");
              }}
            >
              Удалить
            </button>
          </div>
        </Modal>
      )}
      {checkinOpen && (
        <Modal
          title={`Самочувствие · ${fmt(date)}`}
          onClose={() => setCheckinOpen(false)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              update((s) => ({
                ...s,
                life: s.life.journal[date]
                  ? {
                      ...s.life,
                      journal: {
                        ...s.life.journal,
                        [date]: {
                          ...s.life.journal[date],
                          mood: Number(f.get("mood")),
                        },
                      },
                    }
                  : s.life,
                checkins: {
                  ...s.checkins,
                  [date]: {
                    sleep: Number(f.get("sleep")),
                    energy: Number(f.get("energy")),
                    mood: Number(f.get("mood")),
                  },
                },
              }));
              setCheckinOpen(false);
              toast("Состояние сохранено");
            }}
          >
            <label>
              Сон (часов)
              <input
                type="number"
                name="sleep"
                min="0"
                max="24"
                step="0.5"
                required
                defaultValue={checkin?.sleep ?? 8}
              />
            </label>
            <label>
              Энергия · от 1 до 5
              <input
                type="range"
                name="energy"
                min="1"
                max="5"
                defaultValue={checkin?.energy ?? 3}
              />
              <span className="range-labels">
                <span>Мало сил</span>
                <span>Полон энергии</span>
              </span>
            </label>
            <label>
              Настроение · от 1 до 5
              <input
                type="range"
                name="mood"
                min="1"
                max="5"
                defaultValue={
                  state.life.journal[date]?.mood ?? checkin?.mood ?? 3
                }
              />
              <span className="range-labels">
                <span>Тяжёлый день</span>
                <span>Прекрасный день</span>
              </span>
            </label>
            <button className="btn primary" type="submit">
              Сохранить <Check size={17} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
