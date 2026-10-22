import { useEffect, useRef, useState } from "react";
import { initialState } from "../data";
import type { AppState } from "../data";
import { createStorage } from "../storage";
import { WorkspaceEngine } from "./engine";
import type { WorkspaceView } from "./engine";
import { useAuth } from "./Auth";
import { makeTransport } from "./client";
export function useWorkspace() {
  const { client, session, config } = useAuth();
  const engine = useRef<WorkspaceEngine | null>(null);
  const [view, setView] = useState<WorkspaceView>({
    data: structuredClone(initialState),
    ready: false,
    fatal: "",
    localSaving: false,
    localError: "",
    status: "local",
    message: "",
    lastSynced: null,
    conflicts: [],
    dirty: false,
  });
  const userId = session?.user.id;
  useEffect(() => {
    const instance = new WorkspaceEngine(
      createStorage(
        userId && config
          ? `vspace-account-${new URL(config.url).host}-${userId}`
          : "vspace",
      ),
      client && userId && config ? makeTransport(client, userId, config) : null,
    );
    engine.current = instance;
    const unsubscribe = instance.subscribe(() =>
      setView(instance.getSnapshot()),
    );
    void instance.initialize();
    const sync = () => {
      if (document.visibilityState === "visible") void instance.sync();
    };
    const timer = setInterval(sync, 15000);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", sync);
      unsubscribe();
      instance.stop();
      engine.current = null;
    };
  }, [client, userId]);
  useEffect(() => {
    const protect = (e: BeforeUnloadEvent) => {
      if (view.localSaving || view.localError) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [view.localSaving, view.localError]);
  return {
    ...view,
    update: (fn: (s: AppState) => AppState) => engine.current?.update(fn),
    retry: () => engine.current?.sync(),
    resolve: (choice: "device" | "cloud") => engine.current?.resolve(choice),
  };
}
