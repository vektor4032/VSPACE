import { useState } from "react";
export function ImageField({
  value,
  onChange,
  label = "Обложка",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <fieldset className="media-field">
      <legend>{label}</legend>
      {value && <img src={value} alt="Выбранная обложка" />}
      <label>
        Фото с устройства
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError("");
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > 5000000
            ) {
              setError("Выберите JPEG, PNG или WebP до 5 МБ");
              return;
            }
            setBusy(true);
            try {
              const bitmap = await createImageBitmap(file);
              const scale = Math.min(
                1,
                640 / Math.max(bitmap.width, bitmap.height),
              );
              const canvas = document.createElement("canvas");
              canvas.width = Math.max(1, Math.round(bitmap.width * scale));
              canvas.height = Math.max(1, Math.round(bitmap.height * scale));
              const ctx = canvas.getContext("2d");
              if (!ctx) throw Error();
              ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
              bitmap.close();
              let data = canvas.toDataURL("image/jpeg", 0.75);
              if (data.length > 220000)
                data = canvas.toDataURL("image/jpeg", 0.45);
              if (data.length > 220000) {
                setError(
                  "Фото слишком подробное: выберите изображение меньшего размера",
                );
                return;
              }
              onChange(data);
            } catch {
              setError("Не удалось прочитать фото");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <label>
        Или ссылка HTTPS
        <input
          type="url"
          value={value.startsWith("data:") ? "" : value}
          placeholder="https://…"
          maxLength={2000}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      {value && (
        <button
          className="text-link"
          type="button"
          onClick={() => onChange("")}
        >
          Убрать обложку
        </button>
      )}
      {busy && <p role="status">Подготавливаем фото…</p>}
      {error && <p role="alert">{error}</p>}
      <small className="field-help">
        Фото сохраняется вместе с записью. Внешняя ссылка требует интернета.
      </small>
    </fieldset>
  );
}
