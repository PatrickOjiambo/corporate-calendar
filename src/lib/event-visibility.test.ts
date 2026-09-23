import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import type { Session } from "next-auth"
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "@/test/mongo-setup"
import { visibilityFilter } from "@/lib/event-visibility"
import { Event } from "@/models/event"
import { Department } from "@/models/department"
import { Venue } from "@/models/venue"

beforeAll(startTestDatabase)
afterAll(stopTestDatabase)
afterEach(clearTestDatabase)

function session(overrides: Partial<Session["user"]>): Session {
  return {
    user: { id: "000000000000000000000001", role: "admin", department: null, ...overrides },
    expires: "2099-01-01T00:00:00.000Z",
  }
}

async function seed() {
  const ict = await Department.create({ name: "ICT" })
  const venue = await Venue.create({ name: "HQ", timezone: "Africa/Nairobi" })

  const common = {
    venue: venue._id,
    organizingDepartment: ict._id,
    category: "Meeting",
    startAt: new Date("2026-10-07T05:00:00Z"),
    endAt: new Date("2026-10-07T06:00:00Z"),
    timezone: "Africa/Nairobi",
    organizerEmail: "someone@kenyare.co.ke",
    submitterIp: "10.0.0.1",
  }

  const events = {
    approvedOrgWide: await Event.create({
      ...common,
      title: "Approved org-wide",
      audience: "EntireOrganization",
      status: "Approved",
    }),
    approvedPublic: await Event.create({
      ...common,
      title: "Approved public",
      audience: "Public",
      status: "Approved",
    }),
    approvedDepartmentOnly: await Event.create({
      ...common,
      title: "Approved department-scoped",
      audience: "Department",
      audienceDepartments: [ict._id],
      status: "Approved",
    }),
    pendingOrgWide: await Event.create({
      ...common,
      title: "Pending org-wide",
      audience: "EntireOrganization",
      status: "PendingApproval",
    }),
    rejectedOrgWide: await Event.create({
      ...common,
      title: "Rejected org-wide",
      audience: "EntireOrganization",
      status: "Rejected",
    }),
    cancelledOrgWide: await Event.create({
      ...common,
      title: "Cancelled org-wide",
      audience: "EntireOrganization",
      status: "Cancelled",
    }),
  }

  return { ict, events }
}

async function titlesVisibleTo(session: Session | null) {
  const docs = await Event.find(visibilityFilter(session)).lean()
  return docs.map((d) => d.title).sort()
}

describe("visibilityFilter", () => {
  it("shows an anonymous visitor every Approved event, regardless of audience", async () => {
    await seed()
    const titles = await titlesVisibleTo(null)
    expect(titles).toEqual(
      ["Approved department-scoped", "Approved org-wide", "Approved public"].sort()
    )
  })

  it("never leaks a Pending, Rejected, or Cancelled event to an anonymous visitor", async () => {
    await seed()
    const titles = await titlesVisibleTo(null)
    expect(titles).not.toContain("Pending org-wide")
    expect(titles).not.toContain("Rejected org-wide")
    expect(titles).not.toContain("Cancelled org-wide")
  })

  it("returns an empty filter for admin/superadmin, so they see every status", async () => {
    await seed()
    for (const role of ["admin", "superadmin"] as const) {
      expect(visibilityFilter(session({ role }))).toEqual({})
    }
  })

  it("admin visibilityFilter combined with Event.find surfaces every status", async () => {
    await seed()
    const docs = await Event.find(visibilityFilter(session({ role: "admin" }))).lean()
    expect(docs).toHaveLength(6)
  })
})
