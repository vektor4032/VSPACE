import { useEffect, useState, lazy, Suspense } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  MoreHorizontal,
  CircleHelp,
  Menu,
  ShieldCheck,
  Search,
  Plus,
} from "lucide-react";
import { MyDay } from "./features/MyDay";
import { QuickCreate } from "./features/QuickCreate";
import type { QuickKind } from "./features/QuickCreate";
import { GlobalSearch } from "./features/GlobalSearch";
import { ReminderDelivery } from "./features/Reminders";
import { localDate } from "./data";

import { useAuth } from "./cloud/Auth";
import { useWorkspace } from "./cloud/useWorkspace";
import { Context, nav } from "./context";
import type { Page } from "./context";
import { UpdateNotice } from "./components/UpdateNotice";
import { IconButton, Modal } from "./components/ui";
import { TaskForm } from "./components/Tasks";
import { Home } from "./pages/Home";
import { Habits } from "./pages/Habits";
import { Planner } from "./pages/Planner";
import { Projects } from "./pages/Projects";
import { Food } from "./pages/Food";
import { Insights } from "./pages/Insights";
import { SettingsPage } from "./pages/SettingsPage";

const Life = lazy(() =>
  import("./life/Life").then((m) => ({ default: m.Life })),
);

function App() {
  const workspace = useWorkspace();
  const { session } = useAuth();
  const state = workspace.data;
  const update: typeof workspace.update = (fn) =>
    workspace.update((previous) => {
      const next = fn(previous);
      if (
        next.features.home.celebrate &&
        (next.tasks.filter((t) => t.done).length >
          previous.tasks.filter((t) => t.done).length ||
          next.life.goals.some(
            (g) =>
              Object.values(g.dailyEntries).filter(Boolean).length >
              Object.values(
                previous.life.goals.find((x) => x.id === g.id)?.dailyEntries ||
                  {},
              ).filter(Boolean).length,
          ))
      ) {
        queueMicrotask(() =>
          window.dispatchEvent(new CustomEvent("vspace:celebrate")),
        );
      }
      return next;
    });
  const loading = !workspace.ready;
  const loadFailed = !!workspace.fatal;
  const error = workspace.fatal || workspace.localError;
  const saveStatus = workspace.localSaving
    ? "saving"
    : workspace.localError
      ? "error"
      : "saved";
  const [page, setPage] = useState<Page>(() => {
    const p = location.hash.slice(1).split("?")[0];
    return nav.some((n) => n.id === p) ? (p as Page) : "home";
  });
  const [notice, setNotice] = useState("");
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [newTask, setNewTask] = useState(false);
  const [quick, setQuick] = useState<QuickKind | null>(null);
  const [search, setSearch] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (workspace.ready && !location.hash) setPage(state.features.home.start);
  }, [workspace.ready, state.features.home.start]);
  useEffect(() => {
    const handle = (event: Event) => {
      const kind = (event as CustomEvent).detail;
      if (
        ["menu", "task", "expense", "thought", "food", "journal"].includes(kind)
      )
        setQuick(kind);
    };
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearch(true);
      }
    };
    const notificationMessage = (event: MessageEvent) => {
      if (event.data?.type === "VSPACE_OPEN_DAY") {
        location.hash = "day";
        setPage("day");
        setMenu(false);
      }
    };
    navigator.serviceWorker?.addEventListener("message", notificationMessage);
    const celebrate = () => {
      setCelebrating(true);
    };
    window.addEventListener("vspace:quick", handle);
    window.addEventListener("keydown", keyboard);
    window.addEventListener("vspace:celebrate", celebrate);
    return () => {
      navigator.serviceWorker?.removeEventListener(
        "message",
        notificationMessage,
      );
      window.removeEventListener("vspace:quick", handle);
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("vspace:celebrate", celebrate);
    };
  }, []);
  useEffect(() => {
    if (!celebrating) return;
    const timer = setTimeout(() => setCelebrating(false), 1600);
    return () => clearTimeout(timer);
  }, [celebrating]);
  useEffect(() => {
    let observer: MutationObserver | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const focus = () => {
      observer?.disconnect();
      if (timeout) clearTimeout(timeout);
      const id = new URLSearchParams(location.hash.split("?")[1] || "").get(
        "focus",
      );
      if (!id) return;
      const find = () => {
        const element = document.getElementById(id);
        if (
          !element ||
          element.closest("[data-page]")?.getAttribute("data-page") !==
            location.hash.slice(1).split("?")[0]
        )
          return false;
        element.scrollIntoView({ block: "center" });
        element.focus({ preventScroll: true });
        observer?.disconnect();
        return true;
      };
      if (!find()) {
        observer = new MutationObserver(find);
        observer.observe(document.body, { childList: true, subtree: true });
        timeout = setTimeout(() => observer?.disconnect(), 5000);
      }
    };
    focus();
    window.addEventListener("hashchange", focus);
    return () => {
      observer?.disconnect();
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("hashchange", focus);
    };
  }, [page]);
  const [today, setToday] = useState(localDate());
  const reduce = useReducedMotion();
  useEffect(() => {
    const handler = () => {
      const p = location.hash.slice(1).split("?")[0];
      if (nav.some((n) => n.id === p)) setPage(p as Page);
    };
    window.addEventListener("hashchange", handler);
    const timer = setInterval(() => setToday(localDate()), 30000);
    return () => {
      window.removeEventListener("hashchange", handler);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  function go(p: Page) {
    location.hash = p;
    setPage(p);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  if (loading)
    return (
      <div className="loading">
        <div className="brand-mark">V</div>
        <p>Собираем вашу вселенную…</p>
      </div>
    );
  if (loadFailed)
    return (
      <div className="storage-recovery">
        <ShieldCheck size={36} />
        <h1>Сохраним твоё пространство.</h1>
        <p role="alert">{error}</p>
        <button className="btn primary" onClick={() => location.reload()}>
          Повторить загрузку
        </button>
        <p className="field-help">
          Не очищайте данные сайта, если у вас нет резервной копии.
        </p>
      </div>
    );
  return (
    <Context.Provider
      value={{ state, update, toast: setNotice, go, today, cloud: workspace }}
    >
      <MotionConfig
        reducedMotion={state.settings.motion === "full" ? "user" : "always"}
      >
        <div
          className={`app theme-${state.settings.theme} accent-${state.settings.accent} motion-${state.settings.motion}`}
        >
          <aside className={`sidebar ${menu ? "is-open" : ""}`}>
            <a
              href="#home"
              className="brand"
              onClick={() => go("home")}
              aria-label="VSPACE — главная"
            >
              <span className="brand-mark">V</span>VSPACE
              <span className="brand-dot">®</span>
            </a>
            <div className="workspace-label">
              <span className="status-dot" /> PERSONAL UNIVERSE <span>01</span>
            </div>
            <nav aria-label="Основная навигация">
              {nav.map((n, i) => (
                <button
                  key={n.id}
                  className={`nav-item ${page === n.id ? "active" : ""} ${n.id === "settings" ? "nav-settings" : ""}`}
                  aria-current={page === n.id ? "page" : undefined}
                  onClick={() => go(n.id)}
                >
                  <n.icon size={19} />
                  <span>{n.label}</span>
                  {page === n.id ? (
                    <motion.span
                      layoutId="active-nav-dot"
                      className="nav-active-dot"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                      }}
                    />
                  ) : (
                    <span className="nav-index">0{i + 1}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="small-orbit">✳</div>
              <h3>
                Место для
                <br />
                большего.
              </h3>
              <p>
                Маленькие шаги.
                <br />
                Твоя большая вселенная.
              </p>
              <button className="text-link" onClick={() => setHelp(true)}>
                О пространстве <ArrowUpRight size={16} />
              </button>
            </div>
            <button className="profile" onClick={() => go("settings")}>
              <div className="avatar">
                {state.profile.name.slice(0, 1).toUpperCase() || "V"}
              </div>
              <div>
                <strong>{state.profile.name || "Ваше пространство"}</strong>
                <small>
                  {session ? "Облачный аккаунт" : "Локальный профиль"}
                </small>
              </div>
              <MoreHorizontal size={18} />
            </button>
          </aside>
          {menu && (
            <button
              className="sidebar-scrim"
              aria-label="Закрыть меню"
              onClick={() => setMenu(false)}
            />
          )}
          <div className="main-shell">
            <header className="topbar">
              <div className="breadcrumb">
                <button
                  className="mobile-menu icon-btn"
                  onClick={() => setMenu(true)}
                  aria-label="Открыть меню"
                >
                  <Menu size={20} />
                </button>
                <span>Моя вселенная</span>
                <span className="slash">/</span>
                <strong>{nav.find((n) => n.id === page)?.label}</strong>
              </div>
              <div className="top-actions">
                <IconButton
                  label="Поиск по пространству"
                  onClick={() => setSearch(true)}
                >
                  <Search size={18} />
                </IconButton>
                <span
                  className={`local-badge save-${saveStatus}`}
                  role="status"
                  aria-live="polite"
                >
                  <span className="status-dot" />{" "}
                  {saveStatus === "saving"
                    ? "Сохраняем…"
                    : saveStatus === "error"
                      ? "Не сохранено"
                      : session
                        ? workspace.status === "synced" && !workspace.dirty
                          ? "Синхронизировано"
                          : "Сохранено на устройстве"
                        : "Сохранено локально"}
                </span>
                <IconButton
                  label="Как работает VSPACE"
                  onClick={() => setHelp(true)}
                >
                  <CircleHelp size={19} />
                </IconButton>
                <button
                  className="avatar small"
                  onClick={() => go("settings")}
                  aria-label="Настройки профиля"
                >
                  {state.profile.name.slice(0, 1).toUpperCase() || "V"}
                </button>
              </div>
            </header>
            {error && (
              <div className="error-banner" role="alert">
                {error}
                <div className="button-row wrap">
                  <button onClick={() => go("settings")}>Экспорт данных</button>
                  <button onClick={() => location.reload()}>
                    Перезагрузить
                  </button>
                </div>
              </div>
            )}
            <main id="main-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  data-page={page}
                  initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: state.settings.motion === "off" ? 0 : 0.2,
                  }}
                >
                  {page === "home" ? (
                    <Home newTask={() => setNewTask(true)} />
                  ) : page === "day" ? (
                    <MyDay />
                  ) : page === "life" ? (
                    <Suspense
                      fallback={<p role="status">Открываем мою жизнь…</p>}
                    >
                      <Life />
                    </Suspense>
                  ) : page === "habits" ? (
                    <Habits />
                  ) : page === "planner" ? (
                    <Planner />
                  ) : page === "projects" ? (
                    <Projects />
                  ) : page === "food" ? (
                    <Food />
                  ) : page === "insights" ? (
                    <Insights />
                  ) : (
                    <SettingsPage />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
            <footer className="footer">
              <span>VSPACE © {new Date().getFullYear()}</span>
              <span>
                MAKE ROOM FOR YOURSELF <span className="accent-text">↗</span>
              </span>
              <span>Твой ритм. Твоя орбита.</span>
            </footer>
          </div>
          <nav className="bottom-nav" aria-label="Мобильная навигация">
            {nav.slice(0, 4).map((n) => (
              <button
                key={n.id}
                aria-current={page === n.id ? "page" : undefined}
                className={page === n.id ? "active" : ""}
                onClick={() => go(n.id)}
              >
                <n.icon size={20} />
                <span>{n.label}</span>
              </button>
            ))}
            <button onClick={() => setMenu(true)}>
              <Menu size={20} />
              <span>Ещё</span>
            </button>
          </nav>
          <button
            className="global-add"
            aria-label="Быстрая запись"
            onClick={() => setQuick("menu")}
          >
            <Plus size={24} />
            <span>Записать</span>
          </button>
          {quick && (
            <QuickCreate
              key={quick}
              kind={quick}
              onClose={() => setQuick(null)}
            />
          )}
          {search && <GlobalSearch onClose={() => setSearch(false)} />}
          <ReminderDelivery />
          {celebrating &&
            state.features.home.celebrate &&
            state.settings.motion === "full" &&
            !reduce && (
              <div className="completion-burst" aria-hidden="true">
                <span>✳</span>
                <strong>Ещё один шаг!</strong>
              </div>
            )}
          {notice && (
            <div role="status" className="toast">
              <Check size={18} />
              {notice}
            </div>
          )}
          <UpdateNotice
            blocked={workspace.localSaving || !!workspace.localError}
          />
          {newTask && <TaskForm onClose={() => setNewTask(false)} />}{" "}
          {help && (
            <Modal title="Ваша личная вселенная" onClose={() => setHelp(false)}>
              <div className="help-content">
                <p>
                  VSPACE объединяет планы, привычки, проекты и питание. Начните
                  с одной задачи или привычки — статистика появится по мере
                  использования.
                </p>
                <div className="notice">
                  <ShieldCheck />
                  Записи сохраняются на устройстве. Для синхронизации между
                  телефоном и компьютером войдите в один аккаунт в настройках.
                </div>
                <p>
                  Создавайте резервную копию в настройках. Очистка данных
                  браузера удалит ваше пространство. После первого
                  онлайн-запуска production-версии PWA доступна без сети.
                </p>
                <button
                  className="btn primary"
                  onClick={() => {
                    setHelp(false);
                    go("settings");
                  }}
                >
                  Открыть настройки <ArrowRight size={16} />
                </button>
              </div>
            </Modal>
          )}
        </div>
      </MotionConfig>
    </Context.Provider>
  );
}
function WorkspaceRoot() {
  const { ready, session } = useAuth();
  if (!ready)
    return (
      <div className="loading">
        <div className="brand-mark">V</div>
        <p>Открываем пространство…</p>
      </div>
    );
  return <App key={session?.user.id || "guest"} />;
}
export default WorkspaceRoot;
