import Holidays from "date-holidays"

// The four countries Kenya Re operates in (per CLAUDE.md's department list),
// keyed by ISO 3166-1 alpha-2 code for date-holidays. Display names match
// this app's existing vocabulary rather than date-holidays' own country
// names (e.g. "Ivory Coast", not "Côte d'Ivoire").
export const HOLIDAY_COUNTRIES: Record<string, string> = {
  KE: "Kenya",
  UG: "Uganda",
  ZM: "Zambia",
  CI: "Ivory Coast",
}

export type PublicHoliday = {
  date: string // YYYY-MM-DD
  name: string
  countries: string[] // display names, e.g. ["Kenya", "Uganda"]
}

/**
 * Public holidays across all four countries, from `fromYear` to `toYear`
 * inclusive, merged so a holiday landing on the same date with the same
 * name (New Year's Day, Christmas, etc. line up for most of these
 * countries) shows as one entry listing every country it applies to,
 * rather than up to four near-identical bars on the same day.
 */
export function getPublicHolidays(fromYear: number, toYear: number): PublicHoliday[] {
  const merged = new Map<string, PublicHoliday>()

  for (const [code, countryName] of Object.entries(HOLIDAY_COUNTRIES)) {
    const hd = new Holidays(code, { languages: ["en"] })
    for (let year = fromYear; year <= toYear; year++) {
      for (const h of hd.getHolidays(year)) {
        if (h.type !== "public") continue
        const date = h.date.slice(0, 10)
        const key = `${date}__${h.name}`
        const existing = merged.get(key)
        if (existing) {
          existing.countries.push(countryName)
        } else {
          merged.set(key, { date, name: h.name, countries: [countryName] })
        }
      }
    }
  }

  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date))
}
