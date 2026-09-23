import { describe, expect, it } from "vitest"
import { createUserSchema, loginSchema, updateUserSchema } from "@/lib/validators/auth"

describe("loginSchema", () => {
  it("accepts a valid email and 8+ char password", () => {
    expect(loginSchema.safeParse({ email: "a@kenyare.co.ke", password: "password1" }).success).toBe(
      true
    )
  })

  it("rejects a malformed email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "password1" }).success).toBe(
      false
    )
  })

  it("rejects a password shorter than 8 characters", () => {
    expect(loginSchema.safeParse({ email: "a@kenyare.co.ke", password: "short" }).success).toBe(
      false
    )
  })
})

describe("createUserSchema", () => {
  it("defaults role to 'user' when omitted", () => {
    const result = createUserSchema.safeParse({
      name: "Jane",
      email: "jane@kenyare.co.ke",
      password: "password1",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe("user")
    }
  })

  it("accepts an explicit superadmin role", () => {
    const result = createUserSchema.safeParse({
      name: "Root",
      email: "root@kenyare.co.ke",
      password: "password1",
      role: "superadmin",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a role outside the enum (privilege injection attempt)", () => {
    const result = createUserSchema.safeParse({
      name: "Jane",
      email: "jane@kenyare.co.ke",
      password: "password1",
      role: "root",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a malformed department id", () => {
    const result = createUserSchema.safeParse({
      name: "Jane",
      email: "jane@kenyare.co.ke",
      password: "password1",
      department: "ict",
    })
    expect(result.success).toBe(false)
  })

  it("department is optional", () => {
    const result = createUserSchema.safeParse({
      name: "Jane",
      email: "jane@kenyare.co.ke",
      password: "password1",
    })
    expect(result.success).toBe(true)
  })
})

describe("updateUserSchema", () => {
  it("accepts a role-only patch", () => {
    expect(updateUserSchema.safeParse({ role: "admin" }).success).toBe(true)
  })

  it("rejects an invalid role on patch", () => {
    expect(updateUserSchema.safeParse({ role: "owner" }).success).toBe(false)
  })
})
