import { useState, lazy, Suspense, Component } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Plus,
  CalendarDays,
  Folder,
  Droplets,
  Heart,
  Activity,
  Sparkles,
  Flame,
  CheckCheck,
} from "lucide-react";
import { useApp, habitIcons, fmt } from "../context";
import { Ring, SectionHead } from "../components/ui";
import { TaskRow } from "../components/Tasks";
import { HabitForm } from "../pages/Habits";
import { ProjectProgress } from "../pages/Projects";

const OrbScene = lazy(() => import("../Orb"));
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="chrome-knot" />
    ) : (
      this.props.children
    );
  }
}

export function Home({ newTask }: { newTask: () => void }) {
  const { state, update, go, today } = useApp();
  const [habitForm, setHabitForm] = useState(false);
  const tasks = state.tasks.filter((t) => t.date === today);
  const overdue = state.tasks.filter((t) => !t.done && t.date < today).length;
  const complete = tasks.filter((t) => t.done).length;
  const habits = state.habits;
  const habitsDone = habits.filter(
    (h) => (h.entries[today] || 0) >= h.target,
  ).length;
  const total = tasks.length + habits.length;
  const pct = total ? ((complete + habitsDone) / total) * 100 : 0;
  const hour = new Date().getHours();
  const greeting =
    hour < 6
      ? "Доброй ночи"
      : hour < 12
        ? "Доброе утро"
        : hour < 18
          ? "Добрый день"
          : "Добрый вечер";
  const [webgl] = useState(() => {
    if (matchMedia("(max-width: 540px)").matches) return false;
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  });
  const reduce = useReducedMotion();
  return (
    <>
      <div className="home-intro">
        <div>
          <span className="eyebrow">YOUR LIFE, IN YOUR ORBIT</span>
          <h1>
            {greeting}
            {state.profile.name ? `, ${state.profile.name}` : ""}
            <span className="accent-text">.</span>
          </h1>
          <p>Новый день. Новые возможности. Твой собственный ритм.</p>
        </div>
        <div className="date-pill">
          <CalendarDays size={17} />
          <span>
            {fmt(today, { day: "numeric", month: "long", weekday: "short" })}
          </span>
        </div>
      </div>
      {state.profile.focus && (
        <button className="home-focus" onClick={() => go("settings")}>
          <Sparkles size={14} />
          <span>МОЙ ФОКУС</span>
          <strong>{state.profile.focus}</strong>
          <ArrowUpRight size={15} />
        </button>
      )}
      {overdue > 0 && (
        <button className="home-overdue" onClick={() => go("planner")}>
          <CalendarDays size={16} />
          <span>
            Остались задачи с прошлых дней: <strong>{overdue}</strong>
          </span>
          <span>
            Вернуться к ним <ArrowUpRight size={14} />
          </span>
        </button>
      )}
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="status-dot" /> WELCOME TO YOUR UNIVERSE
          </div>
          <h2>
            Всё начинается
            <br />с <span>тебя</span>
            <span className="hero-asterisk">✳</span>
          </h2>
          <p>
            Освободи место для важного.
            <br />
            Создавай, двигайся, будь в своей орбите.
          </p>
          <button className="btn primary" onClick={newTask}>
            Создать свой день <ArrowUpRight size={18} />
          </button>
          <span className="hero-edition">
            PERSONAL OPERATING SYSTEM — VOL. 01
          </span>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orb-glow" />
          {state.settings.three &&
          state.settings.motion === "full" &&
          !reduce &&
          webgl ? (
            <SceneBoundary>
              <Suspense fallback={<div className="chrome-knot" />}>
                <OrbScene />
              </Suspense>
            </SceneBoundary>
          ) : (
            <div className="chrome-knot" />
          )}
          <span className="orbit-coordinate c1">
            55°45′ N<br />
            YOUR INNER SPACE
          </span>
          <span className="orbit-coordinate c2">∞ POSSIBILITIES</span>
          <div className="art-caption">
            <span className="status-dot" /> IN YOUR OWN ORBIT
          </div>
        </div>
        <div className="hero-side-label">EXPLORE YOUR POTENTIAL ↗</div>
      </section>
      <div className="home-stats">
        <div className="stat-card day-progress">
          <Ring value={pct} size={62} />
          <div>
            <span>Прогресс дня</span>
            <strong>
              {complete + habitsDone}
              <small> / {total} действий</small>
            </strong>
          </div>
          <span className="mini-tag">TODAY</span>
        </div>
        <button className="stat-card" onClick={() => go("planner")}>
          <div className="stat-icon">
            <CheckCheck />
          </div>
          <div>
            <span>Задачи выполнены</span>
            <strong>
              {complete}
              <small> / {tasks.length}</small>
            </strong>
          </div>
          <ArrowUpRight className="stat-arrow" size={18} />
        </button>
        <button className="stat-card" onClick={() => go("habits")}>
          <div className="stat-icon purple">
            <Flame />
          </div>
          <div>
            <span>Привычки сегодня</span>
            <strong>
              {habitsDone}
              <small> / {habits.length}</small>
            </strong>
          </div>
          <ArrowUpRight className="stat-arrow" size={18} />
        </button>
        <button className="stat-card" onClick={() => go("projects")}>
          <div className="stat-icon mint">
            <Folder />
          </div>
          <div>
            <span>В работе</span>
            <strong>
              {state.projects.filter((p) => p.status === "active").length}
              <small> проектов</small>
            </strong>
          </div>
          <ArrowUpRight className="stat-arrow" size={18} />
        </button>
      </div>
      <div className="home-columns">
        <section className="panel agenda-panel">
          <SectionHead
            index="01"
            title="В фокусе сегодня"
            action={
              <button className="text-link" onClick={() => go("planner")}>
                Планер <ArrowUpRight size={15} />
              </button>
            }
          />
          <div className="agenda-date">
            <span>{fmt(today, { weekday: "long" })}</span>
            <span>{fmt(today)}</span>
          </div>
          {tasks.length ? (
            tasks
              .slice(0, 4)
              .map((t) => <TaskRow key={t.id} task={t} compact />)
          ) : (
            <div className="focus-empty">
              <span className="empty-cross">+</span>
              <h3>День — чистый лист</h3>
              <p>Выбери первое дело. Остальное сложится.</p>
              <button className="text-link accent-text" onClick={newTask}>
                Добавить задачу <Plus size={16} />
              </button>
            </div>
          )}
          <button className="add-row" onClick={newTask}>
            <Plus size={17} /> Новая задача <span>↵</span>
          </button>
        </section>
        <section className="panel habits-panel">
          <SectionHead
            index="02"
            title="Маленькие ритуалы"
            action={
              <button className="text-link" onClick={() => go("habits")}>
                Все <ArrowUpRight size={15} />
              </button>
            }
          />
          <p className="section-caption">Каждый день — немного ближе к себе.</p>
          {habits.length ? (
            <div className="home-habits">
              {habits.slice(0, 3).map((h) => {
                const Icon = habitIcons[h.icon];
                const value = h.entries[today] || 0;
                return (
                  <button
                    key={h.id}
                    className={`mini-habit ${value >= h.target ? "completed" : ""}`}
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        habits: s.habits.map((x) =>
                          x.id === h.id
                            ? {
                                ...x,
                                entries: {
                                  ...x.entries,
                                  [today]: value >= h.target ? 0 : value + 1,
                                },
                              }
                            : x,
                        ),
                      }))
                    }
                  >
                    <Ring value={(value / h.target) * 100} size={63}>
                      <Icon size={23} />
                    </Ring>
                    <strong>{h.title}</strong>
                    <small>
                      {value} / {h.target} {h.unit}
                    </small>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="home-habits suggestions">
              {[
                { title: "Больше воды", icon: Droplets },
                { title: "Время для себя", icon: Heart },
                { title: "Быть в движении", icon: Activity },
              ].map((x) => (
                <button
                  key={x.title}
                  className="mini-habit"
                  onClick={() => setHabitForm(true)}
                >
                  <div className="suggestion-icon">
                    <x.icon size={25} />
                  </div>
                  <strong>{x.title}</strong>
                  <small>Добавить привычку ↗</small>
                </button>
              ))}
            </div>
          )}
          <div className="ritual-note">
            <Sparkles size={17} />
            <span>Не идеально. Просто регулярно.</span>
            <span>✳</span>
          </div>
        </section>
      </div>
      <section className="projects-home">
        <SectionHead
          index="03"
          title="Идеи в движении"
          action={
            <button className="text-link" onClick={() => go("projects")}>
              Все проекты <ArrowUpRight size={15} />
            </button>
          }
        />
        {state.projects.length ? (
          <div className="project-grid">
            {state.projects.slice(0, 3).map((p) => (
              <button
                className={`project-card project-${p.color}`}
                key={p.id}
                onClick={() => go("projects")}
              >
                <span className="eyebrow">{p.category}</span>
                <h3>{p.title}</h3>
                <ProjectProgress project={p} />
                <ArrowUpRight size={20} />
              </button>
            ))}
          </div>
        ) : (
          <button className="project-invitation" onClick={() => go("projects")}>
            <div className="wire-orbit" aria-hidden="true">
              ✳
            </div>
            <div>
              <span className="eyebrow">YOUR NEXT BIG THING</span>
              <h3>Дай идее пространство.</h3>
              <p>Собери вдохновение, разбей путь на шаги — и начни.</p>
            </div>
            <span className="round-arrow">
              <ArrowUpRight size={24} />
            </span>
          </button>
        )}
      </section>
      {habitForm && <HabitForm onClose={() => setHabitForm(false)} />}
    </>
  );
}
