import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

export const SUBSIDIARY_TIMEZONES = [
  { value: "Africa/Nairobi", label: "Kenya (Nairobi, EAT)" },
  { value: "Africa/Lusaka", label: "Zambia (Lusaka, CAT)" },
  { value: "Africa/Abidjan", label: "Ivory Coast (Abidjan, GMT)" },
] as const

export function getViewerTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** Converts a "YYYY-MM-DDTHH:mm" wall-clock string typed against `timezone` into a UTC Date. */
export function localDateTimeToUtc(localDateTime: string, timezone: string) {
  return fromZonedTime(localDateTime, timezone)
}

export function formatViewerLocal(date: Date | string, pattern = "PPpp") {
  return formatInTimeZone(date, getViewerTimezone(), pattern)
}

export function formatOriginalTimezone(date: Date | string, timezone: string, pattern = "p zzz") {
  return formatInTimeZone(date, timezone, pattern)
}
