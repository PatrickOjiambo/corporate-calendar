import { describe, expect, it } from "vitest"
import { GET } from "@/app/api/holidays/route"

function request(query: string) {
  return new Request(`http://localhost/api/holidays?${query}`)
}

describe("GET /api/holidays", () => {
  it("returns holidays within the requested range", async () => {
    const res = await GET(request("from=2026-01-01&to=2026-12-31"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body.every((h: { date: string }) => h.date >= "2026-01-01" && h.date <= "2026-12-31")).toBe(
      true
    )
  })

  it("excludes holidays outside the requested range", async () => {
    const res = await GET(request("from=2026-12-01&to=2026-12-31"))
    const body = await res.json()
    expect(body.every((h: { date: string }) => h.date.startsWith("2026-12"))).toBe(true)
    expect(body.some((h: { name: string }) => h.name === "Christmas Day")).toBe(true)
    expect(body.some((h: { name: string }) => h.name === "New Year's Day")).toBe(false)
  })

  it("returns 400 for an invalid date", async () => {
    const res = await GET(request("from=not-a-date&to=2026-12-31"))
    expect(res.status).toBe(400)
  })

  it("defaults to the current year when no range is given", async () => {
    const res = await GET(request(""))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
