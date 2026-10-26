import type { Features } from "./schema";
import { localDate, shiftDate } from "../data";
export function inQuietHours(time: string, start: string, end: string) {
  if (start === end) return false;
  return start < end
    ? time >= start && time < end
    : time >= start || time < end;
}
export function dueReminders(features: Features, now: Date) {
  const date = localDate(now),
    time =
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0");
  if (
    inQuietHours(
      time,
      features.reminderPrefs.quietStart,
      features.reminderPrefs.quietEnd,
    )
  )
    return [];
  return features.reminders.filter((r) => {
    const key = `${r.id}:${date}`;
    return (
      r.enabled &&
      r.days.includes(now.getDay()) &&
      r.time <= time &&
      !features.reminderDismissed[key] &&
      (features.reminderSnoozed[key] || 0) <= now.getTime()
    );
  });
}
const escape = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
function fold(line: string) {
  let output = "",
    current = "",
    bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 73) {
      output += current + "\r\n ";
      current = "";
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  return output + current;
}
export function reminderCalendar(
  reminder: Features["reminders"][number],
  now = new Date(),
) {
  let date = localDate(now);
  const clock =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");
  if (clock >= reminder.time) date = shiftDate(date, 1);
  while (!reminder.days.includes(new Date(date + "T12:00:00").getDay()))
    date = shiftDate(date, 1);
  const weekdays = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//VSPACE//Personal reminders//RU",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${encodeURIComponent(reminder.id)}@vspace.local`,
      `DTSTAMP:${now
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")}`,
      `DTSTART:${date.replace(/-/g, "")}T${reminder.time.replace(":", "")}00`,
      "DURATION:PT5M",
      `RRULE:FREQ=WEEKLY;BYDAY=${reminder.days.map((d) => weekdays[d]).join(",")}`,
      `SUMMARY:${escape(reminder.title)}`,
      "DESCRIPTION:Напоминание VSPACE. Уведомления и тихие часы календаря настраиваются отдельно.",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escape(reminder.title)}`,
      "TRIGGER:PT0S",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
