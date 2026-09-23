import type { Session } from "next-auth"

/**
 * Builds the Mongo filter that determines which events a given viewer may
 * see. There are no regular logged-in users in this system — only
 * admins/superadmins authenticate — so the only meaningful distinction is:
 * admins see every status (for the approvals workflow), everyone else
 * (always anonymous) only ever sees Approved events. Audience
 * (EntireOrganization/Department/SpecificDepartments/Public) is purely an
 * informational tag, not a viewer restriction, since there's no way to know
 * an anonymous visitor's department.
 */
export function visibilityFilter(session: Session | null) {
  const role = session?.user?.role
  if (role === "admin" || role === "superadmin") {
    return {}
  }
  return { status: "Approved" }
}
