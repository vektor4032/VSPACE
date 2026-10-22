import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stateSchema } from "../data";
import { RevisionConflict } from "./engine";
import type { CloudTransport } from "./engine";
export type CloudConfig = { url: string; publishableKey: string };
export function validateCloudConfig(value: unknown): CloudConfig | null {
  if (!value || typeof value !== "object") return null;
  const c = value as Partial<CloudConfig>;
  if (
    typeof c.url !== "string" ||
    typeof c.publishableKey !== "string" ||
    !c.publishableKey.trim()
  )
    return null;
  try {
    const u = new URL(c.url);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.pathname !== "/" ||
      u.search ||
      u.hash
    )
      return null;
  } catch {
    return null;
  }
  if (c.publishableKey.startsWith("sb_secret_")) return null;
  if (c.publishableKey.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(
        atob(
          c.publishableKey.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
        ),
      );
      if (payload.role !== "anon") return null;
    } catch {
      return null;
    }
  }
  if (
    !c.publishableKey.startsWith("sb_publishable_") &&
    !c.publishableKey.startsWith("eyJ")
  )
    return null;
  return {
    url: c.url.replace(/\/$/, ""),
    publishableKey: c.publishableKey.trim(),
  };
}
export async function loadCloudConfig(): Promise<CloudConfig | null> {
  const bundled = validateCloudConfig({
    url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });
  if (bundled) return bundled;
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}cloud-config.json`,
      { cache: "no-store", signal: AbortSignal.timeout(6000) },
    );
    if (response.ok) {
      const config = validateCloudConfig(await response.json());
      if (config) {
        try {
          localStorage.setItem("vspace-cloud-config", JSON.stringify(config));
        } catch {}
        return config;
      }
      try {
        localStorage.removeItem("vspace-cloud-config");
      } catch {}
      return null;
    }
  } catch {}
  try {
    return validateCloudConfig(
      JSON.parse(localStorage.getItem("vspace-cloud-config") || "null"),
    );
  } catch {
    return null;
  }
}
export const makeClient = (config: CloudConfig) =>
  createClient(config.url, config.publishableKey, {
    auth: {
      storageKey: `vspace-auth-${new URL(config.url).host}`,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
export function makeTransport(
  authClient: SupabaseClient,
  userId: string,
  config: CloudConfig,
): CloudTransport {
  const client = createClient(config.url, config.publishableKey, {
    accessToken: async () => {
      const { data, error } = await authClient.auth.getSession();
      if (error || data.session?.user.id !== userId)
        throw Error(
          "Аккаунт изменился. Синхронизация предыдущего аккаунта остановлена.",
        );
      return data.session.access_token;
    },
  });
  return {
    async read() {
      const { data, error } = await client
        .from("vspace_workspaces")
        .select("data,revision")
        .eq("user_id", userId)
        .abortSignal(AbortSignal.timeout(12000))
        .maybeSingle();
      if (error)
        throw Error(
          "Не удалось загрузить облачные записи. Проверьте сеть и настройку базы Supabase.",
        );
      if (!data) return null;
      const parsed = stateSchema.safeParse(data.data);
      const revision = Number(data.revision);
      if (!parsed.success || !Number.isSafeInteger(revision) || revision < 1)
        throw Error(
          "Облачные данные не прошли проверку. Локальные записи не изменены.",
        );
      return { data: parsed.data, revision };
    },
    async write(data, revision) {
      const result = await client
        .rpc("save_vspace_workspace", {
          p_expected_revision: revision,
          p_data: data,
        })
        .abortSignal(AbortSignal.timeout(12000));
      if (result.error?.code === "40001") throw new RevisionConflict();
      if (result.error)
        throw Error(
          "Не удалось отправить изменения. Они сохранены на устройстве; повторим при подключении.",
        );
      const next = Number(result.data);
      if (!Number.isSafeInteger(next) || next <= revision)
        throw Error("Сервер вернул некорректную ревизию");
      return next;
    },
  };
}
