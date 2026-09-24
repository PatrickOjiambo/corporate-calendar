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

// date-holidays' bundled data lags behind real-world renames/law changes.
// Corrections go here, keyed by country code -> the library's (outdated)
// name -> the current name, rather than patching node_modules (which
// pnpm install would overwrite anyway).
const NAME_OVERRIDES: Record<string, Record<string, string>> = {
  // Kenya renamed Moi Day (Oct 10) to Mazingira Day (Environment Day) via
  // the Public Holidays (Amendment) Act - the library still calls it Moi Day.
  KE: { "Moi Day": "Mazingira Day" },
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
        const name = NAME_OVERRIDES[code]?.[h.name] ?? h.name
        const key = `${date}__${name}`
        const existing = merged.get(key)
        if (existing) {
          existing.countries.push(countryName)
        } else {
          merged.set(key, { date, name, countries: [countryName] })
        }
      }
    }
  }

  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date))
}
