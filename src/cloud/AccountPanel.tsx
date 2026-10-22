import { useState } from "react";
import {
  Cloud,
  CloudOff,
  LogOut,
  RefreshCw,
  Mail,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "./Auth";
import { useApp } from "../context";
import { createStorage } from "../storage";
import type { AppState } from "../data";
import { Modal, SectionHead } from "../components/ui";
export function AccountPanel() {
  const { client, session, error: authError } = useAuth();
  const { cloud, update, toast } = useApp();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [guest, setGuest] = useState<AppState | null>(null);
  const [logout, setLogout] = useState(false);
  const redirect = new URL(import.meta.env.BASE_URL, location.origin).href;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!client) return;
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const password = String(f.get("password") || "");
    setBusy(true);
    setFailure("");
    setMessage("");
    try {
      if (mode === "reset") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: redirect,
        });
        if (error) throw error;
        setMessage(
          "Если аккаунт с такой почтой существует, мы отправили ссылку для смены пароля.",
        );
      } else if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirect },
        });
        if (error) throw error;
        if (!data.session)
          setMessage(
            "Проверьте почту: подтвердите адрес по ссылке в письме, затем войдите.",
          );
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      setFailure(
        /invalid login/i.test(raw)
          ? "Проверьте почту и пароль."
          : /email not confirmed/i.test(raw)
            ? "Сначала подтвердите адрес по ссылке в письме."
            : /rate limit|too many/i.test(raw)
              ? "Слишком много попыток. Подождите несколько минут."
              : "Не удалось выполнить запрос. Проверьте интернет и настройки Supabase.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function readGuest() {
    setFailure("");
    try {
      const local = await createStorage().load();
      if (!local) {
        toast("На этом устройстве пока нет локальных записей");
        return;
      }
      setGuest(local);
    } catch {
      setFailure("Не удалось прочитать локальные записи. Они не изменены.");
    }
  }
  async function signOut() {
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) {
      setFailure("Не удалось выйти. Попробуйте ещё раз.");
      setBusy(false);
    }
  }
  return (
    <section className="panel account-panel">
      <SectionHead
        index="00"
        title="Одно пространство. Любое устройство."
        action={
          session ? (
            <span className="tag">
              <Cloud size={13} /> АККАУНТ
            </span>
          ) : (
            <span className="tag">
              <CloudOff size={13} /> НА УСТРОЙСТВЕ
            </span>
          )
        }
      />
      {!client ? (
        <div className="notice">
          <CloudOff />
          <div>
            <h3>Подключение облака ещё не настроено</h3>
            <p>
              Локальные записи работают как прежде. Для синхронизации владелец
              приложения должен подключить проект Supabase и базу данных.
            </p>
            <a
              className="text-link"
              href="https://github.com/vektor4032/VSPACE/blob/main/docs/SUPABASE.md"
              target="_blank"
              rel="noreferrer"
            >
              Инструкция подключения <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      ) : session ? (
        <>
          <div className="account-identity">
            <span className="avatar">
              <Mail size={19} />
            </span>
            <div>
              <strong>{session.user.email}</strong>
              <small>Входите с этой почтой на всех устройствах</small>
            </div>
          </div>
          <div className={`sync-card sync-${cloud.status}`} role="status">
            <Cloud size={20} />
            <div>
              <strong>
                {cloud.status === "synced" && !cloud.dirty
                  ? "Всё синхронизировано"
                  : cloud.status === "syncing"
                    ? "Синхронизируем…"
                    : cloud.status === "conflict"
                      ? "Нужно выбрать версию"
                      : cloud.status === "offline"
                        ? "Без сети — записи на устройстве"
                        : cloud.status === "error"
                          ? "Не удалось связаться с облаком"
                          : "Есть изменения на устройстве"}
              </strong>
              <p>
                {cloud.message ||
                  "Изменения отправляются автоматически. Другие устройства проверяют обновления каждые 15 секунд и при возвращении в приложение."}
              </p>
              {cloud.lastSynced && (
                <small>
                  Последняя синхронизация:{" "}
                  {new Date(cloud.lastSynced).toLocaleString("ru-RU")}
                </small>
              )}
            </div>
          </div>
          {cloud.status === "conflict" && (
            <div className="conflict-choice">
              <p>
                Изменения разных записей объединяются. Для совпавших полей
                выберите версию. Перед выбором можно экспортировать резервную
                копию ниже.
              </p>
              <div className="button-row wrap">
                <button
                  className="btn"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await cloud.resolve("device");
                    } catch {
                      setFailure(
                        "Не удалось применить выбор. Повторите попытку.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Оставить мои правки
                </button>
                <button
                  className="btn"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await cloud.resolve("cloud");
                    } catch {
                      setFailure(
                        "Не удалось применить выбор. Повторите попытку.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Взять правки из облака
                </button>
              </div>
            </div>
          )}
          <div className="button-row wrap">
            <button
              className="btn"
              disabled={
                cloud.localSaving ||
                cloud.status === "syncing" ||
                cloud.status === "conflict"
              }
              onClick={() => void cloud.retry()}
            >
              <RefreshCw size={16} /> Синхронизировать
            </button>
            <button
              className="btn"
              disabled={cloud.localSaving}
              onClick={() => void readGuest()}
            >
              Перенести локальные записи
            </button>
            <button className="text-link" onClick={() => setLogout(true)}>
              <LogOut size={15} /> Выйти
            </button>
          </div>
        </>
      ) : (
        <div className="account-login">
          <div>
            <span className="eyebrow">YOUR UNIVERSE, EVERYWHERE</span>
            <h3>
              {mode === "signup"
                ? "Создай свой аккаунт"
                : mode === "reset"
                  ? "Вернуть доступ"
                  : "Вернись в свою вселенную"}
            </h3>
            <p>
              Один аккаунт — общие задачи, привычки, проекты и записи на
              телефоне и компьютере. Локальные данные можно перенести после
              входа.
            </p>
          </div>
          <form className="form" onSubmit={submit}>
            <label>
              Электронная почта
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
            {mode !== "reset" && (
              <label>
                Пароль
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>
            )}
            <button className="btn primary" disabled={busy} type="submit">
              {busy
                ? "Подождите…"
                : mode === "signup"
                  ? "Создать аккаунт"
                  : mode === "reset"
                    ? "Отправить ссылку"
                    : "Войти"}
            </button>
            <div className="button-row wrap">
              {(["login", "signup", "reset"] as const)
                .filter((m) => m !== mode)
                .map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="text-link"
                    disabled={busy}
                    onClick={() => {
                      setMode(m);
                      setMessage("");
                      setFailure("");
                    }}
                  >
                    {m === "login"
                      ? "Уже есть аккаунт"
                      : m === "signup"
                        ? "Регистрация"
                        : "Забыли пароль?"}
                  </button>
                ))}
            </div>
          </form>
        </div>
      )}
      {(failure || authError) && (
        <p className="form-error" role="alert">
          {failure || authError}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {guest && (
        <Modal
          title="Перенести записи в аккаунт?"
          onClose={() => setGuest(null)}
        >
          <p>
            Локальные записи этого браузера заменят содержимое аккаунта на всех
            устройствах: {guest.tasks.length} задач, {guest.habits.length}{" "}
            привычек, {guest.projects.length} проектов. Сначала экспортируйте
            текущие данные аккаунта, если они нужны. Локальный оригинал
            останется в режиме без аккаунта.
          </p>
          <div className="button-row wrap">
            <button className="btn" onClick={() => setGuest(null)}>
              Отмена
            </button>
            <button
              className="btn primary"
              onClick={() => {
                update(() => guest);
                setGuest(null);
                toast(
                  "Записи перенесены на устройство. Ожидаем синхронизацию.",
                );
              }}
            >
              Заменить данные аккаунта
            </button>
          </div>
        </Modal>
      )}
      {logout && (
        <Modal title="Выйти из аккаунта?" onClose={() => setLogout(false)}>
          <p>
            {cloud.localError
              ? "Некоторые изменения ещё не сохранены на устройстве. Сначала экспортируйте JSON и устраните ошибку сохранения."
              : cloud.dirty
                ? "Есть изменения, ещё не отправленные в облако. Они останутся в кеше этого аккаунта на устройстве; для отправки потребуется снова войти здесь."
                : "Облачные записи останутся в аккаунте. После выхода откроется отдельное локальное пространство."}{" "}
            Кеш аккаунта хранится в этом браузере. На общем устройстве очищайте
            данные сайта после выхода.
          </p>
          <div className="button-row">
            <button className="btn" onClick={() => setLogout(false)}>
              Отмена
            </button>
            <button
              className="btn"
              disabled={busy || cloud.localSaving || !!cloud.localError}
              onClick={() => void signOut()}
            >
              Выйти на этом устройстве
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
