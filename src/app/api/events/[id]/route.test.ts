import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "@/test/mongo-setup"
import { Department } from "@/models/department"
import { Venue } from "@/models/venue"
import { Event } from "@/models/event"
import { AuditLog } from "@/models/audit-log"

const mockAuth = vi.hoisted(() => vi.fn<() => Promise<Session | null>>())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const { PATCH } = await import("@/app/api/events/[id]/route")
const { POST: approve } = await import("@/app/api/events/[id]/approve/route")
const { POST: reject } = await import("@/app/api/events/[id]/reject/route")
const { POST: cancel } = await import("@/app/api/events/[id]/cancel/route")

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

async function createEvent(overrides: Record<string, unknown> = {}) {
  const ict = await Department.create({ name: "ICT" })
  const venue = await Venue.create({ name: "HQ", timezone: "Africa/Nairobi" })
  return Event.create({
    title: "Board Meeting",
    status: "PendingApproval",
    audience: "EntireOrganization",
    venue: venue._id,
    organizingDepartment: ict._id,
    category: "Meeting",
    startAt: new Date("2026-10-07T05:00:00Z"),
    endAt: new Date("2026-10-07T06:00:00Z"),
    timezone: "Africa/Nairobi",
    createdBy: "000000000000000000000001",
    ...overrides,
  })
}

function withId(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe("POST /api/events/[id]/approve", () => {
  it("rejects a plain user (403), and does not change the event", async () => {
    mockAuth.mockResolvedValue(session({ role: "user" }))
    const event = await createEvent()
    const res = await approve(new Request("http://x"), withId(event._id.toString()))
    expect(res.status).toBe(403)
    expect((await Event.findById(event._id))!.status).toBe("PendingApproval")
  })

  it("lets an admin approve a pending event, stamping approvedBy/approvedAt", async () => {
    mockAuth.mockResolvedValue(session({ id: "000000000000000000000077", role: "admin" }))
    const event = await createEvent()
    const res = await approve(new Request("http://x"), withId(event._id.toString()))
    expect(res.status).toBe(200)
    const updated = await Event.findById(event._id)
    expect(updated!.status).toBe("Approved")
    expect(updated!.approvedBy!.toString()).toBe("000000000000000000000077")
    expect(updated!.approvedAt).toBeInstanceOf(Date)
  })

  it("writes an 'approved' audit log entry", async () => {
    mockAuth.mockResolvedValue(session({ id: "000000000000000000000077", role: "superadmin" }))
    const event = await createEvent()
    await approve(new Request("http://x"), withId(event._id.toString()))
    const logs = await AuditLog.find({ entityId: event._id }).lean()
    expect(logs.map((l) => l.action)).toEqual(["approved"])
  })

  it("returns 404 for a nonexistent event id instead of throwing", async () => {
    mockAuth.mockResolvedValue(session({ role: "admin" }))
    const res = await approve(new Request("http://x"), withId("000000000000000000000000"))
    expect(res.status).toBe(404)
  })
})

describe("POST /api/events/[id]/reject", () => {
  it("requires a non-empty reason", async () => {
    mockAuth.mockResolvedValue(session({ role: "admin" }))
    const event = await createEvent()
    const res = await reject(
      new Request("http://x", { method: "POST", body: JSON.stringify({ reason: "" }) }),
      withId(event._id.toString())
    )
    expect(res.status).toBe(400)
    expect((await Event.findById(event._id))!.status).toBe("PendingApproval")
  })

  it("sets status Rejected and stores the reason", async () => {
    mockAuth.mockResolvedValue(session({ role: "admin" }))
    const event = await createEvent()
    const res = await reject(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ reason: "No budget approval" }),
      }),
      withId(event._id.toString())
    )
    expect(res.status).toBe(200)
    const updated = await Event.findById(event._id)
    expect(updated!.status).toBe("Rejected")
    expect(updated!.rejectionReason).toBe("No budget approval")
  })

  it("rejects a plain user's attempt to reject someone else's event", async () => {
    mockAuth.mockResolvedValue(session({ id: "000000000000000000000099", role: "user" }))
    const event = await createEvent()
    const res = await reject(
      new Request("http://x", { method: "POST", body: JSON.stringify({ reason: "No" }) }),
      withId(event._id.toString())
    )
    expect(res.status).toBe(403)
  })
})

describe("POST /api/events/[id]/cancel", () => {
  it("soft-cancels an Approved event — status changes, document is not deleted", async () => {
    mockAuth.mockResolvedValue(session({ role: "superadmin" }))
    const event = await createEvent({ status: "Approved" })
    const res = await cancel(new Request("http://x"), withId(event._id.toString()))
    expect(res.status).toBe(200)
    const updated = await Event.findById(event._id)
    expect(updated).not.toBeNull()
    expect(updated!.status).toBe("Cancelled")
  })

  it("rejects a plain user", async () => {
    mockAuth.mockResolvedValue(session({ role: "user" }))
    const event = await createEvent({ status: "Approved" })
    const res = await cancel(new Request("http://x"), withId(event._id.toString()))
    expect(res.status).toBe(403)
  })
})

describe("PATCH /api/events/[id]", () => {
  it("lets the owner edit their own PendingApproval event", async () => {
    const ownerId = "000000000000000000000005"
    mockAuth.mockResolvedValue(session({ id: ownerId, role: "user" }))
    const event = await createEvent({ createdBy: ownerId, status: "PendingApproval" })
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ title: "Renamed" }) }),
      withId(event._id.toString())
    )
    expect(res.status).toBe(200)
    expect((await Event.findById(event._id))!.title).toBe("Renamed")
  })

  it("forbids the owner from editing their own event once it is Approved", async () => {
    const ownerId = "000000000000000000000005"
    mockAuth.mockResolvedValue(session({ id: ownerId, role: "user" }))
    const event = await createEvent({ createdBy: ownerId, status: "Approved" })
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ title: "Renamed" }) }),
      withId(event._id.toString())
    )
    expect(res.status).toBe(403)
    expect((await Event.findById(event._id))!.title).toBe("Board Meeting")
  })

  it("forbids a non-owner, non-admin user from editing someone else's pending event", async () => {
    mockAuth.mockResolvedValue(session({ id: "000000000000000000000099", role: "user" }))
    const event = await createEvent({
      createdBy: "000000000000000000000005",
      status: "PendingApproval",
    })
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ title: "Hijacked" }) }),
      withId(event._id.toString())
    )
    expect(res.status).toBe(403)
  })

  it("lets an admin edit an Approved event without reverting its status (no re-approval loop)", async () => {
    mockAuth.mockResolvedValue(session({ id: "000000000000000000000077", role: "admin" }))
    const event = await createEvent({ status: "Approved" })
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ title: "Corrected title" }) }),
      withId(event._id.toString())
    )
    expect(res.status).toBe(200)
    const updated = await Event.findById(event._id)
    expect(updated!.title).toBe("Corrected title")
    expect(updated!.status).toBe("Approved")
  })

  it("writes an 'edited' audit log entry with the diff", async () => {
    mockAuth.mockResolvedValue(session({ id: "000000000000000000000077", role: "admin" }))
    const event = await createEvent({ status: "Approved" })
    await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ title: "New title" }) }),
      withId(event._id.toString())
    )
    const logs = await AuditLog.find({ entityId: event._id }).lean()
    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe("edited")
    expect((logs[0].metadata as { title?: string }).title).toBe("New title")
  })

  it("rejects an unauthenticated request with 401", async () => {
    mockAuth.mockResolvedValue(null)
    const event = await createEvent()
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ title: "X" }) }),
      withId(event._id.toString())
    )
    expect(res.status).toBe(401)
  })
})
