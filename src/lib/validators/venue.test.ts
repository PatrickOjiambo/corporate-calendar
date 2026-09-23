import { describe, expect, it } from "vitest"
import { createVenueSchema, updateVenueSchema } from "@/lib/validators/venue"

describe("createVenueSchema", () => {
  it("accepts a well-formed venue", () => {
    const result = createVenueSchema.safeParse({
      name: "Kenya Re Academy",
      location: "Nairobi, Kenya",
      capacity: 200,
      timezone: "Africa/Nairobi",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a venue with no location or capacity", () => {
    const result = createVenueSchema.safeParse({
      name: "Virtual",
      timezone: "Africa/Nairobi",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a missing timezone", () => {
    const result = createVenueSchema.safeParse({ name: "Main Boardroom" })
    expect(result.success).toBe(false)
  })

  it("rejects an empty name", () => {
    const result = createVenueSchema.safeParse({ name: "", timezone: "Africa/Nairobi" })
    expect(result.success).toBe(false)
  })

  it("rejects a zero or negative capacity", () => {
    expect(
      createVenueSchema.safeParse({ name: "X", timezone: "Africa/Nairobi", capacity: 0 }).success
    ).toBe(false)
    expect(
      createVenueSchema.safeParse({ name: "X", timezone: "Africa/Nairobi", capacity: -5 }).success
    ).toBe(false)
  })

  it("rejects a non-integer capacity", () => {
    const result = createVenueSchema.safeParse({
      name: "X",
      timezone: "Africa/Nairobi",
      capacity: 12.5,
    })
    expect(result.success).toBe(false)
  })

  it("coerces a numeric string capacity (form inputs arrive as strings)", () => {
    const result = createVenueSchema.safeParse({
      name: "X",
      timezone: "Africa/Nairobi",
      capacity: "150",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.capacity).toBe(150)
    }
  })

  it("defaults isOnline to false when omitted", () => {
    const result = createVenueSchema.safeParse({ name: "Kenya Re Academy", timezone: "Africa/Nairobi" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isOnline).toBe(false)
    }
  })

  it("accepts an online venue with isOnline true", () => {
    const result = createVenueSchema.safeParse({
      name: "Online",
      timezone: "Africa/Nairobi",
      isOnline: true,
    })
    expect(result.success).toBe(true)
  })
})

describe("updateVenueSchema", () => {
  it("accepts a partial update", () => {
    expect(updateVenueSchema.safeParse({ capacity: 50 }).success).toBe(true)
  })

  it("accepts an empty patch", () => {
    expect(updateVenueSchema.safeParse({}).success).toBe(true)
  })
})
