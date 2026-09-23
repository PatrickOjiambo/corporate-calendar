import { describe, expect, it } from "vitest"
import { isTokenStale } from "@/lib/auth-token"

const ONE_DAY_MS = 24 * 60 * 60 * 1000

describe("isTokenStale", () => {
  it("is not stale immediately after issuance", () => {
    const now = Date.now()
    const issuedAt = now / 1000
    expect(isTokenStale(issuedAt, now)).toBe(false)
  })

  it("is not stale just under 24 hours old", () => {
    const now = Date.now()
    const issuedAt = (now - ONE_DAY_MS + 1000) / 1000
    expect(isTokenStale(issuedAt, now)).toBe(false)
  })

  it("is stale just over 24 hours old", () => {
    const now = Date.now()
    const issuedAt = (now - ONE_DAY_MS - 1000) / 1000
    expect(isTokenStale(issuedAt, now)).toBe(true)
  })

  it("treats a missing/zero issuedAt (epoch) as stale — fails open to a DB re-check, not a silent skip", () => {
    // A token that somehow lost its iat should trigger the safer path (hit
    // the DB to confirm the role) rather than being treated as fresh.
    expect(isTokenStale(0, Date.now())).toBe(true)
  })

  it("is stale for a token issued far in the past", () => {
    const now = Date.now()
    const issuedAt = (now - 30 * ONE_DAY_MS) / 1000
    expect(isTokenStale(issuedAt, now)).toBe(true)
  })
})
