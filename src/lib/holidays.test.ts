import { describe, expect, it } from "vitest"
import { getPublicHolidays, HOLIDAY_COUNTRIES } from "@/lib/holidays"

describe("getPublicHolidays", () => {
  it("returns holidays for all four countries within the given year", () => {
    const holidays = getPublicHolidays(2026, 2026)
    expect(holidays.length).toBeGreaterThan(0)
    expect(holidays.every((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.date))).toBe(true)
  })

  it("merges same-named holidays on the same date across countries into one entry", () => {
    const holidays = getPublicHolidays(2026, 2026)
    const newYear = holidays.find((h) => h.date === "2026-01-01" && h.name === "New Year's Day")
    expect(newYear).toBeDefined()
    // All four countries observe New Year's Day - confirms merging, not one row per country.
    expect(newYear!.countries.length).toBe(Object.keys(HOLIDAY_COUNTRIES).length)
    for (const name of Object.values(HOLIDAY_COUNTRIES)) {
      expect(newYear!.countries).toContain(name)
    }
  })

  it("keeps country-specific holidays separate when dates/names differ", () => {
    const holidays = getPublicHolidays(2026, 2026)
    const jamhuri = holidays.find((h) => h.name === "Jamhuri Day")
    expect(jamhuri).toBeDefined()
    expect(jamhuri!.countries).toEqual(["Kenya"])
  })

  it("returns results sorted by date", () => {
    const holidays = getPublicHolidays(2026, 2026)
    const dates = holidays.map((h) => h.date)
    expect(dates).toEqual([...dates].sort())
  })

  it("only includes public holidays, not observances", () => {
    const holidays = getPublicHolidays(2026, 2026)
    const ashWednesday = holidays.find((h) => h.name === "Ash Wednesday")
    expect(ashWednesday).toBeUndefined()
  })
})
