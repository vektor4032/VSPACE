import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";
export function UpdateNotice({ blocked }: { blocked: boolean }) {
  const {
    needRefresh: [available, setAvailable],
    updateServiceWorker,
  } = useRegisterSW();
  if (!available) return null;
  return (
    <div className="update-notice" role="status">
      <div>
        <strong>Доступна новая версия VSPACE</strong>
        <p>
          {blocked
            ? "Дождитесь сохранения записей перед обновлением."
            : "Записи на устройстве сохранятся после обновления."}
        </p>
      </div>
      <button
        className="btn primary"
        disabled={blocked}
        onClick={() => void updateServiceWorker(true)}
      >
        <RefreshCw size={14} /> Обновить
      </button>
      <button
        className="icon-btn"
        aria-label="Обновить позже"
        onClick={() => setAvailable(false)}
      >
        <X size={17} />
      </button>
    </div>
  );
}
