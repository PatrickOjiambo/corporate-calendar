const ONE_DAY_SECONDS = 60 * 60 * 24

/**
 * True once a JWT is old enough that its role/department should be
 * re-checked against the DB. Pulled out of auth.ts (which wires the full
 * NextAuth instance and can't be imported outside a Next.js runtime) so this
 * pure boundary-condition logic can be unit tested directly.
 */
export function isTokenStale(issuedAtSeconds: number, nowMs: number = Date.now()) {
  return nowMs / 1000 - issuedAtSeconds > ONE_DAY_SECONDS
}
