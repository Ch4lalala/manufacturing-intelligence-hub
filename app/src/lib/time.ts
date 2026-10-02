import type { Mode } from "./types";

// Calendar arithmetic deliberately avoids the browser/server timezone.
export function validSourceDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
  );
}
export function sourceTime(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );
  if (
    !match ||
    !validSourceDate(match[1]) ||
    Number(match[2]) > 23 ||
    Number(match[3]) > 59 ||
    Number(match[4] ?? 0) > 59
  )
    throw new Error("Use a real calendar date and source-local time.");
  return `${match[1]} ${match[2]}:${match[3]}:${match[4] ?? "00"}`;
}
export function eligibleTime(time: string, cutoff: string): boolean {
  return sourceTime(time) <= sourceTime(cutoff);
}
export function observationEligible(
  time: string,
  grain: "weekly" | "hourly",
  mode: Mode,
  cutoff: string | null,
  eventDate: string,
): boolean {
  const date = time.slice(0, 10);
  if (!validSourceDate(date)) throw new Error("Invalid observation date.");
  const observed = grain === "weekly" ? `${date} 23:59:59` : sourceTime(time);
  if (mode === "prospective" && (!cutoff || date >= eventDate)) return false;
  return !cutoff || eligibleTime(observed, cutoff);
}
export function requestMode(value: unknown): Mode {
  if (value == null || value === "" || value === "historical")
    return "historical";
  if (value === "prospective") return "prospective";
  throw new Error("Choose historical or prospective scope.");
}
