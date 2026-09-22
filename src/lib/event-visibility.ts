import type { Session } from "next-auth"

/**
 * Builds the Mongo filter that determines which events a given viewer may see.
 * Public/unauthenticated viewers only ever see Approved events aimed at the
 * whole org or the public. Authenticated users additionally see their own
 * submissions (any status) and events scoped to their own department.
 */
export function visibilityFilter(session: Session | null) {
  const publicClause = {
    status: "Approved",
    audience: { $in: ["EntireOrganization", "Public"] },
  }

  if (!session?.user) {
    return publicClause
  }

  const { id, role, department } = session.user

  if (role === "admin" || role === "superadmin") {
    // Admins see everything; further status/mine filtering happens in the route.
    return {}
  }

  const ownClause = { createdBy: id }
  const departmentClause = department
    ? {
        status: "Approved",
        audience: { $in: ["Department", "SpecificDepartments"] },
        audienceDepartments: department,
      }
    : null

  const clauses = [publicClause, ownClause, ...(departmentClause ? [departmentClause] : [])]
  return { $or: clauses }
}
