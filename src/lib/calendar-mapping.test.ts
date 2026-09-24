import { describe, expect, it } from "vitest"
import { toEventInput, holidayToEventInput } from "@/lib/calendar-mapping"
import type { CalendarEvent } from "@/components/events/event-detail-dialog"
import type { PublicHoliday } from "@/lib/holidays"

function baseEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    _id: "evt1",
    title: "Board Meeting",
    allDay: false,
    startAt: "2026-10-07T05:00:00.000Z",
    endAt: "2026-10-07T07:00:00.000Z",
    timezone: "Africa/Nairobi",
    category: "Meeting",
    audience: "EntireOrganization",
    status: "Approved",
    ...overrides,
  }
}

describe("toEventInput", () => {
  it("passes timed (non-allDay) events through with endAt unchanged", () => {
    const input = toEventInput(baseEvent())
    expect(input.start).toBe("2026-10-07T05:00:00.000Z")
    expect(input.end).toBe("2026-10-07T07:00:00.000Z")
    expect(input.allDay).toBe(false)
  })

  it("passes a multi-day timed event through unchanged (FullCalendar spans it natively)", () => {
    const input = toEventInput(
      baseEvent({ startAt: "2026-10-07T06:00:00.000Z", endAt: "2026-10-09T14:00:00.000Z" })
    )
    expect(input.start).toBe("2026-10-07T06:00:00.000Z")
    expect(input.end).toBe("2026-10-09T14:00:00.000Z")
  })

  describe("allDay exclusive-end adapter", () => {
    it("adds one day to endAt for a single-day allDay event", () => {
      // Stored inclusively as Oct 7 - Oct 7. FullCalendar needs an exclusive
      // end, so a single-day event's `end` must be the *next* day (Oct 8),
      // otherwise FullCalendar renders a zero-width / invisible event.
      const input = toEventInput(
        baseEvent({
          allDay: true,
          startAt: "2026-10-07T00:00:00.000Z",
          endAt: "2026-10-07T00:00:00.000Z",
        })
      )
      expect(input.allDay).toBe(true)
      expect(input.start).toBe("2026-10-07T00:00:00.000Z")
      expect(new Date(input.end as Date).toISOString()).toBe("2026-10-08T00:00:00.000Z")
    })

    it("adds exactly one day to endAt for a multi-day allDay event (Oct 7-9 inclusive)", () => {
      // This is the exact case from the product spec: a 3-day whole-day
      // event, Oct 7 through Oct 9 inclusive. Get the +1 day adjustment
      // wrong in either direction and the event either clips its last day
      // or bleeds visibly into a 4th day it was never meant to occupy.
      const input = toEventInput(
        baseEvent({
          allDay: true,
          startAt: "2026-10-07T00:00:00.000Z",
          endAt: "2026-10-09T00:00:00.000Z",
        })
      )
      const end = new Date(input.end as Date)
      expect(end.toISOString()).toBe("2026-10-10T00:00:00.000Z")

      // The FullCalendar convention this test guards: the number of calendar
      // days actually occupied is (end - start), exclusive of `end` itself.
      const start = new Date(input.start as string)
      const occupiedDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      expect(occupiedDays).toBe(3)
    })

    it("does not mutate the original event's endAt string", () => {
      const event = baseEvent({ allDay: true, endAt: "2026-10-09T00:00:00.000Z" })
      toEventInput(event)
      expect(event.endAt).toBe("2026-10-09T00:00:00.000Z")
    })
  })

  it("assigns a background/border color based on the event id, not its category", () => {
    const input = toEventInput(baseEvent({ _id: "abc123", category: "SomeNewCategory" }))
    expect(input.backgroundColor).toMatch(/^#[0-9a-f]{6}$/)
    expect(input.borderColor).toBe(input.backgroundColor)
  })

  it("gives the same event the same color across renders (deterministic, not random each call)", () => {
    const a = toEventInput(baseEvent({ _id: "evt-42" }))
    const b = toEventInput(baseEvent({ _id: "evt-42" }))
    expect(a.backgroundColor).toBe(b.backgroundColor)
  })

  it("gives different events different colors most of the time", () => {
    const colors = new Set(
      ["evt-1", "evt-2", "evt-3", "evt-4", "evt-5"].map(
        (id) => toEventInput(baseEvent({ _id: id })).backgroundColor
      )
    )
    expect(colors.size).toBeGreaterThan(1)
  })

  it("carries the full event through as extendedProps for the detail dialog", () => {
    const event = baseEvent({ description: "Quarterly review" })
    const input = toEventInput(event)
    expect(input.extendedProps).toEqual(event)
  })

  it("uses the Mongo _id as the FullCalendar event id", () => {
    const input = toEventInput(baseEvent({ _id: "abc123" }))
    expect(input.id).toBe("abc123")
  })
})

describe("holidayToEventInput", () => {
  function holiday(overrides: Partial<PublicHoliday> = {}): PublicHoliday {
    return { date: "2026-01-01", name: "New Year's Day", countries: ["Kenya"], ...overrides }
  }

  it("marks the entry as a non-editable, allDay holiday", () => {
    const input = holidayToEventInput(holiday())
    expect(input.allDay).toBe(true)
    expect(input.editable).toBe(false)
    expect(input.extendedProps).toEqual({ isHoliday: true, countries: ["Kenya"] })
  })

  it("adds one day to the single date for FullCalendar's exclusive end", () => {
    const input = holidayToEventInput(holiday({ date: "2026-12-25" }))
    expect(input.start).toBe("2026-12-25")
    expect(new Date(input.end as Date).toISOString()).toBe("2026-12-26T00:00:00.000Z")
  })

  it("shows a single country in parentheses", () => {
    const input = holidayToEventInput(holiday({ name: "Jamhuri Day", countries: ["Kenya"] }))
    expect(input.title).toBe("Jamhuri Day (Kenya)")
  })

  it("lists multiple countries when the holiday is shared", () => {
    const input = holidayToEventInput(
      holiday({ name: "Christmas Day", countries: ["Kenya", "Uganda", "Zambia"] })
    )
    expect(input.title).toBe("Christmas Day — Kenya, Uganda, Zambia")
  })

  it("uses a distinct neutral color, not one from the per-event palette", () => {
    const input = holidayToEventInput(holiday())
    expect(input.backgroundColor).toBe("#e5e7eb")
  })
})
