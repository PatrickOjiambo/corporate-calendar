import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "@/test/mongo-setup"
import { Department } from "@/models/department"
import { Venue } from "@/models/venue"
import { Event } from "@/models/event"
import { AuditLog } from "@/models/audit-log"

const mockAuth = vi.hoisted(() => vi.fn<() => Promise<Session | null>>())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

// Imported after the mock is registered so the route picks up the mocked auth().
const { GET, POST } = await import("@/app/api/events/route")

beforeAll(startTestDatabase)
afterAll(stopTestDatabase)
afterEach(() => {
  vi.resetAllMocks()
  return clearTestDatabase()
})

function session(overrides: Partial<Session["user"]>): Session {
  return {
    user: { id: "000000000000000000000001", role: "user", department: null, ...overrides },
    expires: "2099-01-01T00:00:00.000Z",
  }
}

async function seedFixture() {
  const ict = await Department.create({ name: "ICT" })
  const venue = await Venue.create({ name: "HQ", timezone: "Africa/Nairobi" })
  return { ict, venue }
}

function validEventPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "Board Meeting",
    startAt: "2026-10-07T05:00:00.000Z",
    endAt: "2026-10-07T07:00:00.000Z",
    timezone: "Africa/Nairobi",
    organizerEmail: "organizer@kenyare.co.ke",
    category: "Meeting",
    audience: "EntireOrganization",
    ...overrides,
  }
}

describe("GET /api/events", () => {
  it("handles a from/to range with a properly URL-encoded timezone offset (this is what the calendar's fetch actually sends)", async () => {
    mockAuth.mockResolvedValue(null)
    // What FullCalendar + URLSearchParams produces for a browser in EAT
    // (UTC+3): the "+" is percent-encoded as "%2B" so it survives intact.
    const params = new URLSearchParams({
      from: "2026-08-30T00:00:00+03:00",
      to: "2026-10-11T00:00:00+03:00",
    })
    const res = await GET(new Request(`http://localhost/api/events?${params}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it("returns 400 instead of crashing when '+' arrives unencoded and decodes to a space (regression guard for the fix above)", async () => {
    mockAuth.mockResolvedValue(null)
    // Simulates a client that builds the URL the old, broken way
    // (`?from=${str}`), where a literal "+" in a timezone offset is decoded
    // as a space by URLSearchParams, corrupting the date into "Invalid Date".
    // This used to crash with an uncaught Mongoose CastError (500); it must
    // now fail cleanly with 400.
    const res = await GET(
      new Request("http://localhost/api/events?from=2026-08-30T00:00:00+03:00")
    )
    expect(res.status).toBe(400)
  })

  it("returns only Approved org-wide/public events for an unauthenticated request", async () => {
    mockAuth.mockResolvedValue(null)
    const { ict, venue } = await seedFixture()
    const author = "000000000000000000000099"
    await Event.create({
      title: "Approved",
      status: "Approved",
      audience: "EntireOrganization",
      venue: venue._id,
      organizingDepartment: ict._id,
      category: "Meeting",
      startAt: new Date(),
      endAt: new Date(),
      timezone: "Africa/Nairobi",
      organizerEmail: "organizer@kenyare.co.ke",
      createdBy: author,
    })
    await Event.create({
      title: "Pending",
      status: "PendingApproval",
      audience: "EntireOrganization",
      venue: venue._id,
      organizingDepartment: ict._id,
      category: "Meeting",
      startAt: new Date(),
      endAt: new Date(),
      timezone: "Africa/Nairobi",
      organizerEmail: "organizer@kenyare.co.ke",
      createdBy: author,
    })

    const res = await GET(new Request("http://localhost/api/events"))
    const body = await res.json()
    expect(body.map((e: { title: string }) => e.title)).toEqual(["Approved"])
  })

  it("ignores a client-supplied status filter from a non-admin, non-mine request", async () => {
    mockAuth.mockResolvedValue(session({ role: "user" }))
    const { ict, venue } = await seedFixture()
    await Event.create({
      title: "Someone else's pending event",
      status: "PendingApproval",
      audience: "EntireOrganization",
      venue: venue._id,
      organizingDepartment: ict._id,
      category: "Meeting",
      startAt: new Date(),
      endAt: new Date(),
      timezone: "Africa/Nairobi",
      organizerEmail: "organizer@kenyare.co.ke",
      createdBy: "000000000000000000000099",
    })

    // A malicious/naive client tries to request PendingApproval events it
    // shouldn't see by passing ?status= directly.
    const res = await GET(new Request("http://localhost/api/events?status=PendingApproval"))
    const body = await res.json()
    expect(body).toEqual([])
  })

  it("honors an admin's status filter for the approvals dashboard", async () => {
    mockAuth.mockResolvedValue(session({ role: "admin" }))
    const { ict, venue } = await seedFixture()
    await Event.create({
      title: "Pending event",
      status: "PendingApproval",
      audience: "EntireOrganization",
      venue: venue._id,
      organizingDepartment: ict._id,
      category: "Meeting",
      startAt: new Date(),
      endAt: new Date(),
      timezone: "Africa/Nairobi",
      organizerEmail: "organizer@kenyare.co.ke",
      createdBy: "000000000000000000000099",
    })
    await Event.create({
      title: "Approved event",
      status: "Approved",
      audience: "EntireOrganization",
      venue: venue._id,
      organizingDepartment: ict._id,
      category: "Meeting",
      startAt: new Date(),
      endAt: new Date(),
      timezone: "Africa/Nairobi",
      organizerEmail: "organizer@kenyare.co.ke",
      createdBy: "000000000000000000000099",
    })

    const res = await GET(new Request("http://localhost/api/events?status=PendingApproval"))
    const body = await res.json()
    expect(body.map((e: { title: string }) => e.title)).toEqual(["Pending event"])
  })

  describe("multi-day event visibility in a narrow (Day view) date range", () => {
    it("returns a 3-day event when the requested range is only its LAST day (regression: startAt-only filtering dropped it)", async () => {
      mockAuth.mockResolvedValue(null)
      const { ict, venue } = await seedFixture()
      // A 3-day event: Oct 7 09:00 - Oct 9 17:00. Its startAt is only ever
      // inside a Day-view range for Oct 7 — filtering purely by
      // "startAt in [from, to]" (the original bug) makes it invisible on
      // Oct 8 and Oct 9's Day view, even though Month/Week views show it
      // fine because their wider range still contains Oct 7's startAt.
      await Event.create({
        title: "AI Hackathon",
        status: "Approved",
        audience: "EntireOrganization",
        venue: venue._id,
        organizingDepartment: ict._id,
        category: "Conference",
        startAt: new Date("2026-10-07T06:00:00Z"),
        endAt: new Date("2026-10-09T14:00:00Z"),
        timezone: "Africa/Nairobi",
        organizerEmail: "organizer@kenyare.co.ke",
      })

      // Day view for the LAST day only: Oct 9 00:00 - Oct 10 00:00.
      const params = new URLSearchParams({
        from: "2026-10-09T00:00:00Z",
        to: "2026-10-10T00:00:00Z",
      })
      const res = await GET(new Request(`http://localhost/api/events?${params}`))
      const body = await res.json()
      expect(body.map((e: { title: string }) => e.title)).toEqual(["AI Hackathon"])
    })

    it("does not return an event that ended before the requested range starts", async () => {
      mockAuth.mockResolvedValue(null)
      const { ict, venue } = await seedFixture()
      await Event.create({
        title: "Long-past event",
        status: "Approved",
        audience: "EntireOrganization",
        venue: venue._id,
        organizingDepartment: ict._id,
        category: "Meeting",
        startAt: new Date("2026-01-01T05:00:00Z"),
        endAt: new Date("2026-01-01T06:00:00Z"),
        timezone: "Africa/Nairobi",
        organizerEmail: "organizer@kenyare.co.ke",
      })

      const params = new URLSearchParams({
        from: "2026-10-09T00:00:00Z",
        to: "2026-10-10T00:00:00Z",
      })
      const res = await GET(new Request(`http://localhost/api/events?${params}`))
      expect(await res.json()).toEqual([])
    })
  })
})

describe("POST /api/events", () => {
  it("allows an anonymous (unauthenticated) submission — the whole point is no login required", async () => {
    mockAuth.mockResolvedValue(null)
    const { ict, venue } = await seedFixture()
    const res = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.5" },
        body: JSON.stringify(
          validEventPayload({ venue: venue._id.toString(), organizingDepartment: ict._id.toString() })
        ),
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.createdBy).toBeUndefined()
    expect(body.submitterIp).toBe("203.0.113.5")
    expect(body.status).toBe("PendingApproval")
  })

  it("writes a 'submitted' audit log entry with no actor for an anonymous submission", async () => {
    mockAuth.mockResolvedValue(null)
    const { ict, venue } = await seedFixture()
    await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify(
          validEventPayload({ venue: venue._id.toString(), organizingDepartment: ict._id.toString() })
        ),
      })
    )
    const logs = await AuditLog.find({ entityType: "Event" }).lean()
    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe("submitted")
    expect(logs[0].actor).toBeUndefined()
    expect((logs[0].metadata as { organizerEmail?: string }).organizerEmail).toBe(
      "organizer@kenyare.co.ke"
    )
  })

  it("forces a new submission to PendingApproval even if the client sends a different status", async () => {
    mockAuth.mockResolvedValue(session({ id: "000000000000000000000042" }))
    const { ict, venue } = await seedFixture()

    const res = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify(
          validEventPayload({
            venue: venue._id.toString(),
            organizingDepartment: ict._id.toString(),
            status: "Approved", // client attempting to self-approve
          })
        ),
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.status).toBe("PendingApproval")
    expect(body.createdBy).toBe("000000000000000000000042")
  })

  it("rejects a malformed payload with 400 and does not create a document", async () => {
    mockAuth.mockResolvedValue(session({}))
    const res = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify({ title: "" }),
      })
    )
    expect(res.status).toBe(400)
    expect(await Event.countDocuments({})).toBe(0)
  })

  it("writes a 'submitted' audit log entry on successful creation", async () => {
    mockAuth.mockResolvedValue(session({ id: "000000000000000000000042" }))
    const { ict, venue } = await seedFixture()

    await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        body: JSON.stringify(
          validEventPayload({ venue: venue._id.toString(), organizingDepartment: ict._id.toString() })
        ),
      })
    )

    const logs = await AuditLog.find({ entityType: "Event" }).lean()
    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe("submitted")
    expect(logs[0].actor.toString()).toBe("000000000000000000000042")
  })
})
