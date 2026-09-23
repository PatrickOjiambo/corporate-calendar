import { describe, expect, it } from "vitest"
import { createDepartmentSchema, updateDepartmentSchema } from "@/lib/validators/department"

describe("createDepartmentSchema", () => {
  it("accepts a name-only department", () => {
    expect(createDepartmentSchema.safeParse({ name: "ICT" }).success).toBe(true)
  })

  it("rejects an empty name", () => {
    expect(createDepartmentSchema.safeParse({ name: "" }).success).toBe(false)
  })

  it("rejects a missing name", () => {
    expect(createDepartmentSchema.safeParse({ description: "no name given" }).success).toBe(false)
  })
})

describe("updateDepartmentSchema", () => {
  it("accepts an empty patch", () => {
    expect(updateDepartmentSchema.safeParse({}).success).toBe(true)
  })
})
