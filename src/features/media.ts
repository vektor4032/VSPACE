import { z } from "zod";
export const coverSchema = z
  .string()
  .max(220000)
  .refine(
    (v) =>
      !v ||
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ||
      (/^https:\/\//.test(v) && URL.canParse(v)),
    "Выберите фото или ссылку HTTPS",
  );
