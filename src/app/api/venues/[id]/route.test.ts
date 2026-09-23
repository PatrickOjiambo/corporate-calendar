import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "@/test/mongo-setup"
import { Department } from "@/models/department"
import { Venue } from "@/models/venue"
import { Event } from "@/models/event"

const mockAuth = vi.hoisted(() => vi.fn<() => Promise<Session | null>>())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const { DELETE, PATCH } = await import("@/app/api/venues/[id]/route")

beforeAll(startTestDatabase)
afterAll(stopTestDatabase)
afterEach(() => {
  vi.resetAllMocks()
  return clearTestDatabase()
})

function session(overrides: Partial<Session["user"]>): Session {
  return {
    user: { id: "000000000000000000000001", role: "admin", department: null, ...overrides },
    expires: "2099-01-01T00:00:00.000Z",
  }
}

function withId(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe("DELETE /api/venues/[id]", () => {
  it("rejects a plain user", async () => {
    mockAuth.mockResolvedValue(session({ role: "user" }))
    const venue = await Venue.create({ name: "HQ", timezone: "Africa/Nairobi" })
    const res = await DELETE(new Request("http://x"), withId(venue._id.toString()))
    expect(res.status).toBe(403)
  })

  it("deletes an unreferenced venue", async () => {
    mockAuth.mockResolvedValue(session({}))
    const venue = await Venue.create({ name: "Unused Venue", timezone: "Africa/Nairobi" })
    const res = await DELETE(new Request("http://x"), withId(venue._id.toString()))
    expect(res.status).toBe(200)
    expect(await Venue.findById(venue._id)).toBeNull()
  })

  it("blocks deletion with 409 when an event references the venue", async () => {
    mockAuth.mockResolvedValue(session({}))
    const dept = await Department.create({ name: "ICT" })
    const venue = await Venue.create({ name: "HQ", timezone: "Africa/Nairobi" })
    await Event.create({
      title: "Board Meeting",
      status: "Approved",
      audience: "EntireOrganization",
      venue: venue._id,
      organizingDepartment: dept._id,
      category: "Meeting",
      startAt: new Date(),
      endAt: new Date(),
      timezone: "Africa/Nairobi",
      createdBy: "000000000000000000000001",
    })

    const res = await DELETE(new Request("http://x"), withId(venue._id.toString()))
    expect(res.status).toBe(409)
    expect(await Venue.findById(venue._id)).not.toBeNull()
  })

  it("returns 404 for a nonexistent venue", async () => {
    mockAuth.mockResolvedValue(session({}))
    const res = await DELETE(new Request("http://x"), withId("000000000000000000000000"))
    expect(res.status).toBe(404)
  })
})

describe("PATCH /api/venues/[id]", () => {
  it("rejects a plain user", async () => {
    mockAuth.mockResolvedValue(session({ role: "user" }))
    const venue = await Venue.create({ name: "HQ", timezone: "Africa/Nairobi" })
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ name: "New HQ" }) }),
      withId(venue._id.toString())
    )
    expect(res.status).toBe(403)
  })

  it("rejects an invalid timezone-less patch shape gracefully (partial schema allows it)", async () => {
    mockAuth.mockResolvedValue(session({}))
    const venue = await Venue.create({ name: "HQ", timezone: "Africa/Nairobi" })
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ capacity: -1 }) }),
      withId(venue._id.toString())
    )
    expect(res.status).toBe(400)
  })

  it("updates capacity for an admin", async () => {
    mockAuth.mockResolvedValue(session({}))
    const venue = await Venue.create({ name: "HQ", timezone: "Africa/Nairobi" })
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ capacity: 80 }) }),
      withId(venue._id.toString())
    )
    expect(res.status).toBe(200)
    expect((await Venue.findById(venue._id))!.capacity).toBe(80)
  })
})
