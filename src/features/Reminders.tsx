import { useEffect, useRef, useState } from "react";
import { Bell, Clock } from "lucide-react";
import { useApp } from "../context";
import { localDate, uid } from "../data";
import { Modal } from "../components/ui";
import { DeleteButton } from "../life/ui";
import type { Features } from "./schema";
import { dueReminders, reminderCalendar } from "./reminders";
import { downloadText } from "./WeeklyMeals";
const days = [
  [1, "Пн"],
  [2, "Вт"],
  [3, "Ср"],
  [4, "Чт"],
  [5, "Пт"],
  [6, "Сб"],
  [0, "Вс"],
] as const;
export function ReminderSettings() {
  const { state, update, toast } = useApp();
  const [edit, setEdit] = useState<
    Features["reminders"][number] | null | undefined
  >();
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [error, setError] = useState("");
  const [permission, setPermission] = useState(
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission,
  );
  const prefs = state.features.reminderPrefs;
  return (
    <section className="panel feature-card">
      <div className="toolbar">
        <div>
          <h3>Личные напоминания</h3>
          <p className="field-help">
            Уведомления VSPACE работают, пока приложение открыто. Для
            напоминаний при закрытом приложении скачай событие и импортируй в
            календарь телефона.
          </p>
        </div>
        <button
          className="btn"
          onClick={() => {
            setWeekdays([0, 1, 2, 3, 4, 5, 6]);
            setError("");
            setEdit(null);
          }}
        >
          Новое напоминание
        </button>
      </div>
      <div className="form-grid">
        <label>
          Тихие часы: с
          <input
            type="time"
            value={prefs.quietStart}
            onChange={(e) =>
              e.target.value &&
              update((s) => ({
                ...s,
                features: {
                  ...s.features,
                  reminderPrefs: {
                    ...s.features.reminderPrefs,
                    quietStart: e.target.value,
                  },
                },
              }))
            }
          />
        </label>
        <label>
          Тихие часы: до
          <input
            type="time"
            value={prefs.quietEnd}
            onChange={(e) =>
              e.target.value &&
              update((s) => ({
                ...s,
                features: {
                  ...s.features,
                  reminderPrefs: {
                    ...s.features.reminderPrefs,
                    quietEnd: e.target.value,
                  },
                },
              }))
            }
          />
        </label>
      </div>
      <p className="field-help">
        Время берётся с устройства. Одинаковое начало и окончание отключают
        тихие часы. Календарь использует собственные настройки уведомлений.
      </p>
      <button
        className="btn"
        disabled={
          permission === "unsupported" ||
          permission === "granted" ||
          permission === "denied"
        }
        onClick={async () => {
          try {
            const result = await Notification.requestPermission();
            setPermission(result);
            toast(
              result === "granted"
                ? "Уведомления разрешены"
                : "Можно использовать напоминания внутри приложения и календарь",
            );
          } catch {
            setPermission("unsupported");
          }
        }}
      >
        {permission === "granted"
          ? "Системные уведомления разрешены"
          : permission === "denied"
            ? "Уведомления запрещены в браузере"
            : permission === "unsupported"
              ? "Системные уведомления не поддерживаются"
              : "Разрешить системные уведомления"}
      </button>
      {state.features.reminders.map((r) => (
        <article className="feature-list-row" key={r.id}>
          <label className="life-checkbox">
            <input
              type="checkbox"
              checked={r.enabled}
              aria-label={`Включено: ${r.title}`}
              onChange={() =>
                update((s) => ({
                  ...s,
                  features: {
                    ...s.features,
                    reminders: s.features.reminders.map((x) =>
                      x.id === r.id ? { ...x, enabled: !x.enabled } : x,
                    ),
                  },
                }))
              }
            />
            <span>
              {r.title}
              <small>
                {r.time} ·{" "}
                {days
                  .filter(([d]) => r.days.includes(d))
                  .map(([, label]) => label)
                  .join(", ")}
              </small>
            </span>
          </label>
          <div className="button-row wrap">
            <button
              className="text-link"
              onClick={() => {
                setWeekdays(r.days);
                setError("");
                setEdit(r);
              }}
            >
              Изменить
            </button>
            <button
              className="btn"
              onClick={() =>
                downloadText(
                  reminderCalendar(r),
                  `vspace-reminder-${r.id}.ics`,
                  "text/calendar;charset=utf-8",
                )
              }
            >
              В календарь
            </button>
            <DeleteButton
              title={r.title}
              onDelete={() =>
                update((s) => ({
                  ...s,
                  features: {
                    ...s.features,
                    reminders: s.features.reminders.filter(
                      (x) => x.id !== r.id,
                    ),
                  },
                }))
              }
            />
          </div>
        </article>
      ))}
      {edit !== undefined && (
        <Modal
          title={edit ? "Изменить напоминание" : "Новое напоминание"}
          onClose={() => setEdit(undefined)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!weekdays.length) {
                setError("Выберите хотя бы один день");
                return;
              }
              const f = new FormData(e.currentTarget);
              const r = {
                id: edit?.id || uid(),
                title: String(f.get("title")).trim(),
                time: String(f.get("time")),
                days: weekdays,
                enabled: edit?.enabled ?? true,
              };
              if (!r.title) return;
              update((s) => ({
                ...s,
                features: {
                  ...s.features,
                  reminders: edit
                    ? s.features.reminders.map((x) =>
                        x.id === edit.id ? r : x,
                      )
                    : [...s.features.reminders, r],
                },
              }));
              setEdit(undefined);
            }}
          >
            <label>
              О чём напомнить
              <input
                name="title"
                required
                maxLength={300}
                defaultValue={edit?.title}
              />
            </label>
            <label>
              Время напоминания
              <input
                name="time"
                type="time"
                required
                defaultValue={edit?.time || "09:00"}
              />
            </label>
            <fieldset className="life-fieldset">
              <legend>Дни напоминания</legend>
              <div className="weekday-options">
                {days.map(([d, label]) => (
                  <label key={d}>
                    <input
                      type="checkbox"
                      checked={weekdays.includes(d)}
                      onChange={() =>
                        setWeekdays(
                          weekdays.includes(d)
                            ? weekdays.filter((x) => x !== d)
                            : [...weekdays, d],
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p role="alert">{error}</p>}
            <button className="btn primary">Сохранить напоминание</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
export function ReminderDelivery() {
  const { state, update } = useApp();
  const [now, setNow] = useState(() => new Date());
  const notified = useRef(new Set<string>());
  useEffect(() => {
    const check = () => setNow(new Date());
    const interval = setInterval(check, 15000);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", check);
    };
  }, []);
  const due = dueReminders(state.features, now);
  useEffect(() => {
    if (
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    )
      return;
    for (const r of due) {
      const key = `${r.id}:${localDate(now)}:${state.features.reminderSnoozed[`${r.id}:${localDate(now)}`] || 0}`;
      let sent = notified.current.has(key);
      try {
        sent ||= localStorage.getItem("vspace-reminder-" + key) === "sent";
      } catch {}
      if (sent) continue;
      notified.current.add(key);
      try {
        localStorage.setItem("vspace-reminder-" + key, "sent");
      } catch {}
      void navigator.serviceWorker
        ?.getRegistration()
        .then((reg) => {
          if (reg)
            return reg.showNotification("VSPACE", {
              body: r.title,
              tag: key,
              icon: import.meta.env.BASE_URL + "icon-192.png",
              data: {
                url: new URL(import.meta.env.BASE_URL + "#day", location.origin)
                  .href,
              },
            });
          const notification = new Notification("VSPACE", {
            body: r.title,
            tag: key,
          });
          notification.onclick = () => {
            window.focus();
            location.hash = "day";
          };
        })
        .catch(() => {});
    }
  }, [due.map((r) => r.id).join(","), localDate(now)]);
  if (!due.length) return null;
  return (
    <aside className="reminder-tray" aria-label="Пора вспомнить">
      <div className="life-row">
        <strong>
          <Bell size={16} /> Напоминания
        </strong>
        <small>При открытом VSPACE</small>
      </div>
      {due.slice(0, 3).map((r) => {
        const key = `${r.id}:${localDate(now)}`;
        return (
          <article key={r.id}>
            <p>{r.title}</p>
            <div className="button-row">
              <button
                className="text-link"
                onClick={() =>
                  update((s) => ({
                    ...s,
                    features: {
                      ...s.features,
                      reminderSnoozed: {
                        ...s.features.reminderSnoozed,
                        [key]: Date.now() + 15 * 60000,
                      },
                    },
                  }))
                }
              >
                <Clock size={13} />
                Через 15 мин
              </button>
              <button
                className="btn"
                onClick={() =>
                  update((s) => ({
                    ...s,
                    features: {
                      ...s.features,
                      reminderDismissed: {
                        ...s.features.reminderDismissed,
                        [key]: true,
                      },
                    },
                  }))
                }
              >
                Готово
              </button>
            </div>
          </article>
        );
      })}
    </aside>
  );
}
