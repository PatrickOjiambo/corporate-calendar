import { describe, expect, it } from "vitest"
import { getRequestIp } from "@/lib/request-ip"

describe("getRequestIp", () => {
  it("returns the first IP from a comma-separated x-forwarded-for chain", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" },
    })
    expect(getRequestIp(req)).toBe("203.0.113.5")
  })

  it("trims whitespace around the first IP", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "  203.0.113.5 , 70.41.3.18" } })
    expect(getRequestIp(req)).toBe("203.0.113.5")
  })

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = new Request("http://x", { headers: { "x-real-ip": "198.51.100.7" } })
    expect(getRequestIp(req)).toBe("198.51.100.7")
  })

  it("returns undefined when neither header is present", () => {
    const req = new Request("http://x")
    expect(getRequestIp(req)).toBeUndefined()
  })
})
