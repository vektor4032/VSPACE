import { stateSchema } from "../data";
import type { AppState } from "../data";
const absent = Symbol("absent");
type Value = unknown | typeof absent;
export function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return (
      a.length === b.length && a.every((value, index) => same(value, b[index]))
    );
  if (isRecord(a) && isRecord(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && same(a[key], b[key]))
    );
  }
  return false;
}
const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function mergeWorkspaces(
  base: AppState,
  local: AppState,
  remote: AppState,
  preference: "device" | "cloud" = "device",
): { data: AppState; conflicts: string[] } {
  const conflicts: string[] = [];
  function merge(b: Value, l: Value, r: Value, path: string): Value {
    if (same(l, r)) return l;
    if (same(l, b)) return r;
    if (same(r, b)) return l;
    if (isRecord(l) && isRecord(r) && (isRecord(b) || b === absent)) {
      const original = isRecord(b) ? b : {};
      const result: Record<string, unknown> = {};
      for (const key of new Set([
        ...Object.keys(original),
        ...Object.keys(l),
        ...Object.keys(r),
      ])) {
        const value = merge(
          key in original ? original[key] : absent,
          key in l ? l[key] : absent,
          key in r ? r[key] : absent,
          `${path}.${key}`,
        );
        if (value !== absent) result[key] = value;
      }
      return result;
    }
    if (Array.isArray(b) && Array.isArray(l) && Array.isArray(r)) {
      if (
        [...b, ...l, ...r].every((v) => isRecord(v) && typeof v.id === "string")
      ) {
        const bm = new Map(b.map((v) => [v.id, v])),
          lm = new Map(l.map((v) => [v.id, v])),
          rm = new Map(r.map((v) => [v.id, v]));
        const result: unknown[] = [];
        for (const id of new Set([...rm.keys(), ...lm.keys(), ...bm.keys()])) {
          const value = merge(
            bm.get(id) ?? absent,
            lm.get(id) ?? absent,
            rm.get(id) ?? absent,
            `${path}[${id}]`,
          );
          if (value !== absent) result.push(value);
        }
        return result;
      }
      if ([...b, ...l, ...r].every((v) => typeof v === "string"))
        return [...new Set([...r, ...l, ...b])].filter((v) =>
          merge(b.includes(v), l.includes(v), r.includes(v), `${path}[${v}]`),
        );
    }
    conflicts.push(path);
    return preference === "device" ? l : r;
  }
  return {
    data: stateSchema.parse(merge(base, local, remote, "workspace")),
    conflicts,
  };
}
