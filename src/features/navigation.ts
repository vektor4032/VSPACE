import { z } from "zod";
export function hashParam(name: string) {
  return new URLSearchParams(location.hash.split("?")[1] || "").get(name);
}
export function dateParam(fallback: string) {
  const date = hashParam("date");
  return date && z.iso.date().safeParse(date).success ? date : fallback;
}
