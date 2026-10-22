import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { CloudConfig } from "./client";
import { loadCloudConfig, makeClient } from "./client";
import { Modal } from "../components/ui";
type AuthValue = {
  config?: CloudConfig;
  client: SupabaseClient | null;
  session: Session | null;
  ready: boolean;
  error: string;
};
const AuthContext = createContext<AuthValue>({
  client: null,
  session: null,
  ready: false,
  error: "",
});
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<AuthValue>({
    client: null,
    session: null,
    ready: false,
    error: "",
  });
  const [recovery, setRecovery] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void loadCloudConfig()
      .then(async (config) => {
        if (!active) return;
        if (!config) {
          setValue({ client: null, session: null, ready: true, error: "" });
          return;
        }
        const client = makeClient(config);
        const { data: subscription } = client.auth.onAuthStateChange(
          (event, session) => {
            if (!active) return;
            setValue({ config, client, session, ready: true, error: "" });
            if (event === "PASSWORD_RECOVERY") setRecovery(true);
          },
        );
        unsubscribe = () => subscription.subscription.unsubscribe();
        const result = await client.auth.getSession();
        if (active)
          setValue({
            config,
            client,
            session: result.data.session,
            ready: true,
            error: result.error
              ? "Не удалось восстановить вход. Повторите вход в настройках."
              : "",
          });
      })
      .catch(() => {
        if (active)
          setValue({
            client: null,
            session: null,
            ready: true,
            error: "Не удалось подключить облачный аккаунт.",
          });
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
  return (
    <AuthContext.Provider value={value}>
      {children}
      {recovery && value.client && (
        <Modal title="Новый пароль" onClose={() => setRecovery(false)}>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const password = String(
                new FormData(e.currentTarget).get("password"),
              );
              setBusy(true);
              const { error } = await value.client!.auth.updateUser({
                password,
              });
              setBusy(false);
              if (error)
                setMessage(
                  "Не удалось изменить пароль. Попробуйте запросить новую ссылку.",
                );
              else {
                setMessage("");
                setRecovery(false);
              }
            }}
          >
            <label>
              Новый пароль
              <input
                type="password"
                name="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </label>
            {message && (
              <p role="alert" className="form-error">
                {message}
              </p>
            )}
            <button className="btn primary" disabled={busy}>
              {busy ? "Сохраняем…" : "Сохранить пароль"}
            </button>
          </form>
        </Modal>
      )}
    </AuthContext.Provider>
  );
}
