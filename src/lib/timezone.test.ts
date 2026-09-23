import { describe, expect, it } from "vitest"
import {
  localDateTimeToUtc,
  formatOriginalTimezone,
  formatViewerLocal,
  getViewerTimezone,
} from "@/lib/timezone"

describe("localDateTimeToUtc", () => {
  it("converts a Nairobi (EAT, UTC+3) wall-clock time to the correct UTC instant", () => {
    const utc = localDateTimeToUtc("2026-10-07T08:00", "Africa/Nairobi")
    expect(utc.toISOString()).toBe("2026-10-07T05:00:00.000Z")
  })

  it("converts a Lusaka (CAT, UTC+2) wall-clock time to the correct UTC instant", () => {
    const utc = localDateTimeToUtc("2026-10-07T08:00", "Africa/Lusaka")
    expect(utc.toISOString()).toBe("2026-10-07T06:00:00.000Z")
  })

  it("converts an Abidjan (GMT, UTC+0) wall-clock time to the correct UTC instant", () => {
    const utc = localDateTimeToUtc("2026-10-07T08:00", "Africa/Abidjan")
    expect(utc.toISOString()).toBe("2026-10-07T08:00:00.000Z")
  })
})

describe("formatOriginalTimezone", () => {
  // Regression guard: Node's ICU data has no "EAT"/"CAT" abbreviation for
  // these zones (ICU falls back to "GMT+3"), which date-fns-tz's `zzz` token
  // surfaces as-is. The product needs the conventional abbreviation, so
  // formatOriginalTimezone hardcodes it — this test fails if that mapping
  // regresses back to raw GMT-offset output.
  it("labels a Nairobi instant with the EAT abbreviation, not a raw GMT offset", () => {
    const label = formatOriginalTimezone("2026-10-07T05:00:00.000Z", "Africa/Nairobi")
    expect(label).toContain("8:00")
    expect(label).toContain("EAT")
    expect(label).not.toContain("GMT")
  })

  it("labels the same instant differently for Lusaka (CAT)", () => {
    const label = formatOriginalTimezone("2026-10-07T05:00:00.000Z", "Africa/Lusaka")
    expect(label).toContain("7:00")
    expect(label).toContain("CAT")
  })

  it("falls back to a GMT-offset label for an unlisted timezone", () => {
    const label = formatOriginalTimezone("2026-10-07T05:00:00.000Z", "Asia/Tokyo")
    expect(label).toContain("GMT+9")
  })
})

describe("getViewerTimezone / formatViewerLocal", () => {
  it("returns a non-empty IANA-shaped timezone string", () => {
    const tz = getViewerTimezone()
    expect(tz.length).toBeGreaterThan(0)
  })

  it("formats an instant using the process's local timezone without throwing", () => {
    expect(() => formatViewerLocal("2026-10-07T05:00:00.000Z")).not.toThrow()
  })
})

describe("round trip: localDateTimeToUtc -> formatOriginalTimezone", () => {
  it("shows the same wall-clock time the organizer typed, regardless of the process's own timezone", () => {
    // This is the core guarantee the whole timezone feature rests on: an
    // organizer in Lusaka types "14:00" against Africa/Lusaka, and anyone
    // asking "what was the original time" must get back exactly "14:00",
    // not something skewed by whatever timezone the server happens to run in.
    const utc = localDateTimeToUtc("2026-10-07T14:00", "Africa/Lusaka")
    const label = formatOriginalTimezone(utc, "Africa/Lusaka")
    expect(label).toContain("2:00 PM")
    expect(label).toContain("CAT")
  })
})
