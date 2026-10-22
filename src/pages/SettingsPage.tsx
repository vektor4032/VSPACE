import { useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  Trash2,
  Download,
  Upload,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { initialState, localDate, parseImport } from "../data";
import type { AppState } from "../data";
import { useApp } from "../context";
import { Modal, PageHeading, SectionHead } from "../components/ui";

export function SettingsPage() {
  const { state, update, toast, go } = useApp();
  const [confirm, setConfirm] = useState<"reset" | "import" | null>(null);
  const [incoming, setIncoming] = useState<AppState | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vspace-${localDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Резервная копия создана");
  }
  async function importFile(file: File) {
    setError("");
    try {
      if (file.size > 5_000_000) throw Error("Максимальный размер — 5 МБ");
      const data = parseImport(await file.text());
      setIncoming(data);
      setConfirm("import");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось прочитать файл");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR SPACE, YOUR RULES"
        title="Настроить под себя."
        description="Пусть это пространство будет действительно твоим."
      />
      <div className="settings-layout">
        <section className="panel">
          <SectionHead index="01" title="Личный профиль" />
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              update((s) => ({
                ...s,
                profile: {
                  name: String(f.get("name")).trim(),
                  focus: String(f.get("focus")).trim(),
                },
              }));
              toast("Профиль сохранён");
            }}
          >
            <label>
              Как тебя зовут?
              <input
                name="name"
                maxLength={50}
                defaultValue={state.profile.name}
                placeholder="Ваше имя"
              />
            </label>
            <label>
              На чём сейчас фокус?
              <input
                name="focus"
                maxLength={150}
                defaultValue={state.profile.focus}
                placeholder="То, что важно прямо сейчас"
              />
            </label>
            <button className="btn primary" type="submit">
              Сохранить профиль <Check size={17} />
            </button>
          </form>
          {state.profile.focus && (
            <div className="profile-focus">
              <span className="eyebrow">MY NORTH STAR</span>
              <p>{state.profile.focus}</p>
            </div>
          )}
        </section>
        <section className="panel">
          <SectionHead index="02" title="Внешний вид" />
          <div className="form">
            <label>
              Тема
              <select
                value={state.settings.theme}
                onChange={(e) => {
                  const theme = e.target.value as AppState["settings"]["theme"];
                  update((s) => ({ ...s, settings: { ...s.settings, theme } }));
                }}
              >
                <option value="dark">Obsidian Black</option>
                <option value="forest">Deep Forest</option>
              </select>
            </label>
            <label>
              Акцентный цвет
              <div className="color-options">
                {[
                  ["lime", "#b7ff36", "Acid Lime"],
                  ["mint", "#39e6a2", "Digital Mint"],
                  ["violet", "#ac96ff", "Electric Violet"],
                ].map(([v, c, l]) => (
                  <button
                    key={v}
                    type="button"
                    className={state.settings.accent === v ? "active" : ""}
                    aria-pressed={state.settings.accent === v}
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        settings: {
                          ...s.settings,
                          accent: v as AppState["settings"]["accent"],
                        },
                      }))
                    }
                  >
                    <i style={{ background: c }} />
                    {l}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Анимации
              <select
                value={state.settings.motion}
                onChange={(e) => {
                  const value = e.target
                    .value as AppState["settings"]["motion"];
                  update((s) => ({
                    ...s,
                    settings: { ...s.settings, motion: value },
                  }));
                }}
              >
                <option value="full">Полные · с учётом настроек системы</option>
                <option value="reduced">Сокращённые</option>
                <option value="off">Отключены</option>
              </select>
            </label>
            <label className="toggle-row">
              <span>
                3D на главной
                <small>На слабых устройствах можно отключить</small>
              </span>
              <input
                type="checkbox"
                checked={state.settings.three}
                onChange={(e) => {
                  const three = e.target.checked;
                  update((s) => ({ ...s, settings: { ...s.settings, three } }));
                }}
              />
            </label>
          </div>
        </section>
        <section className="panel">
          <SectionHead index="03" title="Данные и приватность" />
          <div className="notice">
            <ShieldCheck size={23} />
            <p>
              Ваши данные остаются в этом браузере. VSPACE не отправляет их на
              сервер. Синхронизация между устройствами пока не подключена.
            </p>
          </div>
          <div className="button-row wrap">
            <button className="btn" onClick={exportData}>
              <Download size={17} /> Экспорт JSON
            </button>
            <button className="btn" onClick={() => input.current?.click()}>
              <Upload size={17} /> Импорт JSON
            </button>
            <input
              ref={input}
              className="sr-only"
              type="file"
              accept=".json,application/json"
              aria-label="Импорт резервной копии"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importFile(f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="field-help">
            Импорт заменяет всё пространство. Перед импортом сохраните резервную
            копию. Очистка данных браузера удалит локальные записи.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="text-link danger-text"
            onClick={() => setConfirm("reset")}
          >
            <Trash2 size={16} /> Удалить все личные данные
          </button>
        </section>
        <section className="panel settings-about">
          <span className="brand">
            VSPACE<span className="accent-text">®</span>
          </span>
          <p>Personal Digital Universe</p>
          <span className="tag">LOCAL FIRST · V1.0</span>
          <p className="muted">
            Создавайте привычки, управляйте проектами и находите место для себя.
          </p>
          <button className="btn" onClick={() => go("habits")}>
            Управлять привычками <ArrowUpRight size={16} />
          </button>
          <div className="pwa-note">
            <Globe size={17} />
            <span>
              В production-версии приложение можно установить через меню
              браузера. После первого посещения интерфейс и рецепты доступны
              офлайн.
            </span>
          </div>
        </section>
      </div>
      {confirm && (
        <Modal
          title={
            confirm === "reset" ? "Очистить пространство?" : "Заменить данные?"
          }
          onClose={() => {
            setConfirm(null);
            setIncoming(null);
          }}
        >
          <p>
            {confirm === "reset"
              ? "Все задачи, проекты, привычки, история и настройки будут удалены. Это действие нельзя отменить без резервной копии."
              : `Будет импортировано: ${incoming?.tasks.length} задач, ${incoming?.habits.length} привычек, ${incoming?.projects.length} проектов. Текущие данные будут заменены.`}
          </p>
          <div className="button-row wrap">
            <button className="btn" onClick={exportData}>
              <Download size={16} /> Сначала экспортировать
            </button>
            <button
              className="btn danger"
              onClick={() => {
                if (confirm === "reset") {
                  update(() => structuredClone(initialState));
                  toast("Пространство очищено");
                } else if (incoming) {
                  update(() => incoming);
                  toast("Резервная копия восстановлена");
                }
                setConfirm(null);
                setIncoming(null);
              }}
            >
              {confirm === "reset" ? "Удалить всё" : "Заменить данные"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
