import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

export const SUBSIDIARY_TIMEZONES = [
  { value: "Africa/Nairobi", label: "Kenya (Nairobi, EAT)" },
  { value: "Africa/Kampala", label: "Uganda (Kampala, EAT)" },
  { value: "Africa/Lusaka", label: "Zambia (Lusaka, CAT)" },
  { value: "Africa/Abidjan", label: "Ivory Coast (Abidjan, GMT)" },
] as const

// Node's ICU data has no short zone-name abbreviation for these zones (none of
// them observe DST, so `Intl`/date-fns-tz's `zzz` token falls back to a bare
// "GMT+3" style offset instead of "EAT"). Hardcode the conventional
// abbreviations for the zones we actually support; anything else falls back
// to the GMT-offset label date-fns-tz already produces.
const KNOWN_ABBREVIATIONS: Record<string, string> = {
  "Africa/Nairobi": "EAT",
  "Africa/Kampala": "EAT",
  "Africa/Lusaka": "CAT",
  "Africa/Abidjan": "GMT",
}

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

export function formatOriginalTimezone(date: Date | string, timezone: string, pattern = "p") {
  const time = formatInTimeZone(date, timezone, pattern)
  const abbreviation = KNOWN_ABBREVIATIONS[timezone] ?? formatInTimeZone(date, timezone, "zzz")
  return `${time} ${abbreviation}`
}
