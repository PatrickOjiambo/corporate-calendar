import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "@/test/mongo-setup"
import { Department } from "@/models/department"
import { Venue } from "@/models/venue"
import { Event } from "@/models/event"

const mockAuth = vi.hoisted(() => vi.fn<() => Promise<Session | null>>())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const { DELETE, PATCH } = await import("@/app/api/departments/[id]/route")

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

describe("DELETE /api/departments/[id]", () => {
  it("rejects a plain user", async () => {
    mockAuth.mockResolvedValue(session({ role: "user" }))
    const dept = await Department.create({ name: "ICT" })
    const res = await DELETE(new Request("http://x"), withId(dept._id.toString()))
    expect(res.status).toBe(403)
  })

  it("deletes a department that is not referenced by any event", async () => {
    mockAuth.mockResolvedValue(session({}))
    const dept = await Department.create({ name: "Unused Dept" })
    const res = await DELETE(new Request("http://x"), withId(dept._id.toString()))
    expect(res.status).toBe(200)
    expect(await Department.findById(dept._id)).toBeNull()
  })

  it("blocks deletion with 409 when the department organizes an event", async () => {
    mockAuth.mockResolvedValue(session({}))
    const dept = await Department.create({ name: "ICT" })
    const venue = await Venue.create({ name: "HQ", timezone: "Africa/Nairobi" })
    await Event.create({
      title: "ICT Meeting",
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

    const res = await DELETE(new Request("http://x"), withId(dept._id.toString()))
    expect(res.status).toBe(409)
    expect(await Department.findById(dept._id)).not.toBeNull()
  })

  it("blocks deletion with 409 when the department is only an audienceDepartments target, not the organizer", async () => {
    mockAuth.mockResolvedValue(session({}))
    const organizer = await Department.create({ name: "ICT" })
    const audienceDept = await Department.create({ name: "Finance" })
    const venue = await Venue.create({ name: "HQ", timezone: "Africa/Nairobi" })
    await Event.create({
      title: "Cross-dept briefing",
      status: "Approved",
      audience: "SpecificDepartments",
      audienceDepartments: [audienceDept._id],
      venue: venue._id,
      organizingDepartment: organizer._id,
      category: "Meeting",
      startAt: new Date(),
      endAt: new Date(),
      timezone: "Africa/Nairobi",
      createdBy: "000000000000000000000001",
    })

    const res = await DELETE(new Request("http://x"), withId(audienceDept._id.toString()))
    expect(res.status).toBe(409)
  })

  it("returns 404 for a nonexistent department", async () => {
    mockAuth.mockResolvedValue(session({}))
    const res = await DELETE(new Request("http://x"), withId("000000000000000000000000"))
    expect(res.status).toBe(404)
  })
})

describe("PATCH /api/departments/[id]", () => {
  it("rejects a plain user", async () => {
    mockAuth.mockResolvedValue(session({ role: "user" }))
    const dept = await Department.create({ name: "ICT" })
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ name: "Tech" }) }),
      withId(dept._id.toString())
    )
    expect(res.status).toBe(403)
  })

  it("updates the name for an admin", async () => {
    mockAuth.mockResolvedValue(session({}))
    const dept = await Department.create({ name: "ICT" })
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ name: "Technology" }) }),
      withId(dept._id.toString())
    )
    expect(res.status).toBe(200)
    expect((await Department.findById(dept._id))!.name).toBe("Technology")
  })
})
