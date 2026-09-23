import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import type { Session } from "next-auth"
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "@/test/mongo-setup"
import { visibilityFilter } from "@/lib/event-visibility"
import { Event } from "@/models/event"
import { Department } from "@/models/department"
import { Venue } from "@/models/venue"
import { User } from "@/models/user"

beforeAll(startTestDatabase)
afterAll(stopTestDatabase)
afterEach(clearTestDatabase)

function session(overrides: Partial<Session["user"]>): Session {
  return {
    user: { id: "000000000000000000000001", role: "user", department: null, ...overrides },
    expires: "2099-01-01T00:00:00.000Z",
  }
}

async function seed() {
  const ict = await Department.create({ name: "ICT" })
  const finance = await Department.create({ name: "Finance" })
  const venue = await Venue.create({ name: "HQ", timezone: "Africa/Nairobi" })
  const alice = await User.create({
    name: "Alice",
    email: "alice@kenyare.co.ke",
    passwordHash: "x",
    role: "user",
    department: ict._id,
  })
  const bob = await User.create({
    name: "Bob",
    email: "bob@kenyare.co.ke",
    passwordHash: "x",
    role: "user",
    department: finance._id,
  })
  // Neutral third author: fixtures below are authored by someone other than
  // the alice/bob viewers under test, so "always see your own events" can't
  // accidentally make department/status scoping look like it's working.
  const carol = await User.create({
    name: "Carol",
    email: "carol@kenyare.co.ke",
    passwordHash: "x",
    role: "user",
    department: ict._id,
  })

  const common = {
    venue: venue._id,
    organizingDepartment: ict._id,
    category: "Meeting",
    startAt: new Date("2026-10-07T05:00:00Z"),
    endAt: new Date("2026-10-07T06:00:00Z"),
    timezone: "Africa/Nairobi",
    createdBy: carol._id,
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
    approvedIctOnly: await Event.create({
      ...common,
      title: "Approved ICT-only",
      audience: "Department",
      audienceDepartments: [ict._id],
      status: "Approved",
    }),
    pendingIctOnly: await Event.create({
      ...common,
      title: "Pending ICT-only",
      audience: "Department",
      audienceDepartments: [ict._id],
      status: "PendingApproval",
    }),
    aliceOwnPending: await Event.create({
      ...common,
      title: "Alice's own pending event",
      audience: "EntireOrganization",
      status: "PendingApproval",
      createdBy: alice._id,
    }),
    bobOwnPending: await Event.create({
      ...common,
      title: "Bob's own pending event",
      audience: "EntireOrganization",
      status: "PendingApproval",
      createdBy: bob._id,
    }),
  }

  return { ict, finance, alice, bob, carol, events }
}

async function titlesVisibleTo(session: Session | null) {
  const docs = await Event.find(visibilityFilter(session)).lean()
  return docs.map((d) => d.title).sort()
}

describe("visibilityFilter", () => {
  it("shows an unauthenticated viewer only Approved EntireOrganization/Public events", async () => {
    await seed()
    const titles = await titlesVisibleTo(null)
    expect(titles).toEqual(["Approved org-wide", "Approved public"])
  })

  it("never leaks a Pending, Rejected, or department-scoped event to an unauthenticated viewer", async () => {
    await seed()
    const titles = await titlesVisibleTo(null)
    expect(titles).not.toContain("Pending org-wide")
    expect(titles).not.toContain("Rejected org-wide")
    expect(titles).not.toContain("Approved ICT-only")
  })

  it("shows a plain user in the ICT department the public events plus ICT-scoped Approved events", async () => {
    const { ict, alice } = await seed()
    const titles = await titlesVisibleTo(
      session({ id: alice._id.toString(), role: "user", department: ict._id.toString() })
    )
    expect(titles).toEqual(
      ["Alice's own pending event", "Approved ICT-only", "Approved org-wide", "Approved public"].sort()
    )
  })

  it("does NOT show a user in Finance the ICT-scoped event, even though it's Approved", async () => {
    const { finance, bob } = await seed()
    const titles = await titlesVisibleTo(
      session({ id: bob._id.toString(), role: "user", department: finance._id.toString() })
    )
    expect(titles).not.toContain("Approved ICT-only")
    expect(titles).not.toContain("Pending ICT-only")
  })

  it("does NOT show a user a department-scoped event that is still Pending, even in their own department", async () => {
    const { ict, alice } = await seed()
    const titles = await titlesVisibleTo(
      session({ id: alice._id.toString(), role: "user", department: ict._id.toString() })
    )
    expect(titles).not.toContain("Pending ICT-only")
  })

  it("always shows a user their own pending/rejected events regardless of audience or department", async () => {
    const { finance, bob } = await seed()
    const titles = await titlesVisibleTo(
      session({ id: bob._id.toString(), role: "user", department: finance._id.toString() })
    )
    expect(titles).toContain("Bob's own pending event")
  })

  it("does NOT show a user someone else's pending event just because it's not theirs", async () => {
    const { finance, bob } = await seed()
    const titles = await titlesVisibleTo(
      session({ id: bob._id.toString(), role: "user", department: finance._id.toString() })
    )
    expect(titles).not.toContain("Alice's own pending event")
  })

  it("returns an empty filter for admin/superadmin, so they see every status and audience", async () => {
    await seed()
    for (const role of ["admin", "superadmin"] as const) {
      const filter = visibilityFilter(session({ role }))
      expect(filter).toEqual({})
    }
  })

  it("does not crash for a user with no department and correctly excludes department-scoped events", async () => {
    await seed()
    const titles = await titlesVisibleTo(
      session({ id: "000000000000000000000099", role: "user", department: null })
    )
    expect(titles).not.toContain("Approved ICT-only")
    expect(titles).toContain("Approved org-wide")
  })
})
