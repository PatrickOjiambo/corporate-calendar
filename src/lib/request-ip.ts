/** Best-effort client IP from standard proxy headers. Not spoof-proof — only used as a soft audit trail for anonymous submissions, never for access control. */
export function getRequestIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim()
  return request.headers.get("x-real-ip") ?? undefined
}
