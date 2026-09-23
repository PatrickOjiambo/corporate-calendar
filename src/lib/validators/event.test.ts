import { describe, expect, it } from "vitest"
import { createEventSchema, rejectEventSchema, updateEventSchema } from "@/lib/validators/event"

const VALID_ID_A = "507f1f77bcf86cd799439011"
const VALID_ID_B = "507f1f77bcf86cd799439012"

function baseEvent(overrides: Record<string, unknown> = {}) {
  return {
    title: "Board Meeting",
    startAt: "2026-10-07T05:00:00.000Z",
    endAt: "2026-10-07T07:00:00.000Z",
    timezone: "Africa/Nairobi",
    venue: VALID_ID_A,
    organizerEmail: "jane@kenyare.co.ke",
    organizingDepartment: VALID_ID_A,
    category: "Meeting",
    audience: "EntireOrganization",
    ...overrides,
  }
}

describe("createEventSchema", () => {
  it("accepts a well-formed event", () => {
    const result = createEventSchema.safeParse(baseEvent())
    expect(result.success).toBe(true)
  })

  it("defaults allDay to false and audience to EntireOrganization when omitted", () => {
    const { title, startAt, endAt, timezone, venue, organizerEmail, organizingDepartment, category } =
      baseEvent()
    const result = createEventSchema.safeParse({
      title,
      startAt,
      endAt,
      timezone,
      venue,
      organizerEmail,
      organizingDepartment,
      category,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.allDay).toBe(false)
      expect(result.data.audience).toBe("EntireOrganization")
    }
  })

  it("rejects an empty title", () => {
    const result = createEventSchema.safeParse(baseEvent({ title: "" }))
    expect(result.success).toBe(false)
  })

  it("rejects a venue id that isn't a valid ObjectId shape", () => {
    const result = createEventSchema.safeParse(baseEvent({ venue: "not-an-id" }))
    expect(result.success).toBe(false)
  })

  it("rejects an unknown category", () => {
    const result = createEventSchema.safeParse(baseEvent({ category: "Party" }))
    expect(result.success).toBe(false)
  })

  describe("organizerEmail", () => {
    it("rejects a missing organizer email", () => {
      const result = createEventSchema.safeParse(baseEvent({ organizerEmail: undefined }))
      expect(result.success).toBe(false)
    })

    it("rejects a malformed organizer email", () => {
      const result = createEventSchema.safeParse(baseEvent({ organizerEmail: "not-an-email" }))
      expect(result.success).toBe(false)
    })

    it("accepts a valid organizer email", () => {
      const result = createEventSchema.safeParse(
        baseEvent({ organizerEmail: "organizer@kenyare.co.ke" })
      )
      expect(result.success).toBe(true)
    })
  })

  describe("meetingLink", () => {
    it("is optional (only relevant for the Online venue)", () => {
      const result = createEventSchema.safeParse(baseEvent({ meetingLink: undefined }))
      expect(result.success).toBe(true)
    })

    it("rejects a malformed URL when provided", () => {
      const result = createEventSchema.safeParse(baseEvent({ meetingLink: "not-a-url" }))
      expect(result.success).toBe(false)
    })

    it("accepts a valid meeting URL", () => {
      const result = createEventSchema.safeParse(
        baseEvent({ meetingLink: "https://meet.google.com/abc-defg-hij" })
      )
      expect(result.success).toBe(true)
    })
  })

  describe("customLocation", () => {
    it("is optional (only relevant for the Other venue)", () => {
      const result = createEventSchema.safeParse(baseEvent({ customLocation: undefined }))
      expect(result.success).toBe(true)
    })

    it("rejects an empty string when provided", () => {
      const result = createEventSchema.safeParse(baseEvent({ customLocation: "" }))
      expect(result.success).toBe(false)
    })

    it("accepts a real address", () => {
      const result = createEventSchema.safeParse(
        baseEvent({ customLocation: "Sarova Stanley Hotel, Nairobi" })
      )
      expect(result.success).toBe(true)
    })
  })

  describe("endAt >= startAt refinement", () => {
    it("rejects an end time before the start time", () => {
      const result = createEventSchema.safeParse(
        baseEvent({ startAt: "2026-10-07T07:00:00.000Z", endAt: "2026-10-07T05:00:00.000Z" })
      )
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.endAt).toBeTruthy()
      }
    })

    it("accepts endAt exactly equal to startAt (zero-length instant, e.g. a Deadline)", () => {
      const result = createEventSchema.safeParse(
        baseEvent({ startAt: "2026-10-07T05:00:00.000Z", endAt: "2026-10-07T05:00:00.000Z" })
      )
      expect(result.success).toBe(true)
    })

    it("accepts a multi-day span where endAt is on a later calendar day", () => {
      const result = createEventSchema.safeParse(
        baseEvent({ startAt: "2026-10-07T06:00:00.000Z", endAt: "2026-10-09T14:00:00.000Z" })
      )
      expect(result.success).toBe(true)
    })
  })

  describe("audienceDepartments requirement", () => {
    it("rejects audience Department with no departments selected", () => {
      const result = createEventSchema.safeParse(
        baseEvent({ audience: "Department", audienceDepartments: [] })
      )
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.audienceDepartments).toBeTruthy()
      }
    })

    it("rejects audience Department with audienceDepartments entirely omitted", () => {
      const result = createEventSchema.safeParse(baseEvent({ audience: "Department" }))
      expect(result.success).toBe(false)
    })

    it("accepts audience Department with at least one department", () => {
      const result = createEventSchema.safeParse(
        baseEvent({ audience: "Department", audienceDepartments: [VALID_ID_A] })
      )
      expect(result.success).toBe(true)
    })

    it("accepts audience SpecificDepartments with multiple departments", () => {
      const result = createEventSchema.safeParse(
        baseEvent({
          audience: "SpecificDepartments",
          audienceDepartments: [VALID_ID_A, VALID_ID_B],
        })
      )
      expect(result.success).toBe(true)
    })

    it("does not require audienceDepartments for EntireOrganization", () => {
      const result = createEventSchema.safeParse(baseEvent({ audience: "EntireOrganization" }))
      expect(result.success).toBe(true)
    })

    it("does not require audienceDepartments for Public", () => {
      const result = createEventSchema.safeParse(baseEvent({ audience: "Public" }))
      expect(result.success).toBe(true)
    })
  })
})

describe("updateEventSchema", () => {
  it("accepts a partial patch with only one field", () => {
    const result = updateEventSchema.safeParse({ title: "Renamed Meeting" })
    expect(result.success).toBe(true)
  })

  it("accepts an empty object (no-op patch)", () => {
    const result = updateEventSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("still rejects a malformed field when present", () => {
    const result = updateEventSchema.safeParse({ venue: "not-an-id" })
    expect(result.success).toBe(false)
  })
})

describe("rejectEventSchema", () => {
  it("requires a non-empty reason", () => {
    expect(rejectEventSchema.safeParse({ reason: "" }).success).toBe(false)
    expect(rejectEventSchema.safeParse({}).success).toBe(false)
  })

  it("accepts a valid reason", () => {
    expect(rejectEventSchema.safeParse({ reason: "No budget approval" }).success).toBe(true)
  })

  it("rejects a reason over 1000 characters", () => {
    const result = rejectEventSchema.safeParse({ reason: "x".repeat(1001) })
    expect(result.success).toBe(false)
  })
})
