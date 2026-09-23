import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import { startTestDatabase, stopTestDatabase, clearTestDatabase } from "@/test/mongo-setup"
import { User } from "@/models/user"

const mockAuth = vi.hoisted(() => vi.fn<() => Promise<Session | null>>())
vi.mock("@/lib/auth", () => ({ auth: mockAuth }))

const { GET, POST } = await import("@/app/api/admin/users/route")
const { PATCH } = await import("@/app/api/admin/users/[id]/route")

beforeAll(startTestDatabase)
afterAll(stopTestDatabase)
afterEach(() => {
  vi.resetAllMocks()
  return clearTestDatabase()
})

function session(overrides: Partial<Session["user"]>): Session {
  return {
    user: { id: "000000000000000000000001", role: "superadmin", department: null, ...overrides },
    expires: "2099-01-01T00:00:00.000Z",
  }
}

function withId(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe("GET /api/admin/users", () => {
  it("rejects a non-superadmin (including a plain admin)", async () => {
    mockAuth.mockResolvedValue(session({ role: "admin" }))
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("never leaks passwordHash to a superadmin listing users", async () => {
    mockAuth.mockResolvedValue(session({}))
    await User.create({
      name: "Jane",
      email: "jane@kenyare.co.ke",
      passwordHash: "super-secret-hash",
      role: "user",
    })
    const res = await GET()
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].passwordHash).toBeUndefined()
  })
})

describe("POST /api/admin/users", () => {
  it("rejects a non-superadmin", async () => {
    mockAuth.mockResolvedValue(session({ role: "admin" }))
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({
          name: "Jane",
          email: "jane@kenyare.co.ke",
          password: "password1",
          role: "user",
        }),
      })
    )
    expect(res.status).toBe(403)
  })

  it("creates a user with a bcrypt password hash, never the plaintext", async () => {
    mockAuth.mockResolvedValue(session({}))
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({
          name: "Jane",
          email: "jane@kenyare.co.ke",
          password: "password1",
          role: "user",
        }),
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.passwordHash).toBeUndefined()

    const stored = await User.findOne({ email: "jane@kenyare.co.ke" });
    expect(stored!.passwordHash).not.toBe("password1")
    expect(stored!.passwordHash.length).toBeGreaterThan(20)
  })

  it("rejects a duplicate email with 409 and does not create a second user", async () => {
    mockAuth.mockResolvedValue(session({}))
    await User.create({ name: "Jane", email: "jane@kenyare.co.ke", passwordHash: "x", role: "user" })

    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({
          name: "Jane Impostor",
          email: "jane@kenyare.co.ke",
          password: "password1",
          role: "admin",
        }),
      })
    )
    expect(res.status).toBe(409)
    expect(await User.countDocuments({ email: "jane@kenyare.co.ke" })).toBe(1)
  })

  it("rejects an attempt to set a role outside the enum", async () => {
    mockAuth.mockResolvedValue(session({}))
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({
          name: "Jane",
          email: "jane@kenyare.co.ke",
          password: "password1",
          role: "root",
        }),
      })
    )
    expect(res.status).toBe(400)
  })
})

describe("PATCH /api/admin/users/[id]", () => {
  it("rejects a non-superadmin", async () => {
    mockAuth.mockResolvedValue(session({ role: "admin" }))
    const user = await User.create({ name: "Jane", email: "j@x.com", passwordHash: "x", role: "user" })
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ role: "admin" }) }),
      withId(user._id.toString())
    )
    expect(res.status).toBe(403)
  })

  it("promotes a user to admin", async () => {
    mockAuth.mockResolvedValue(session({}))
    const user = await User.create({ name: "Jane", email: "j@x.com", passwordHash: "x", role: "user" })
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ role: "admin" }) }),
      withId(user._id.toString())
    )
    expect(res.status).toBe(200)
    expect((await User.findById(user._id))!.role).toBe("admin")
  })
})
