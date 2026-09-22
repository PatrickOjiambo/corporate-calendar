// Shared enums with no Mongoose/Node dependency, safe to import from client
// components. Models and validators import these instead of duplicating them.

export const USER_ROLES = ["superadmin", "admin", "user"] as const
export type UserRole = (typeof USER_ROLES)[number]

export const EVENT_CATEGORIES = [
  "Meeting",
  "Training",
  "Workshop",
  "Conference",
  "Staff Activity",
  "Corporate Event",
  "Deadline",
  "Other",
] as const

export const EVENT_AUDIENCES = [
  "EntireOrganization",
  "Department",
  "SpecificDepartments",
  "Public",
] as const

export const EVENT_STATUSES = [
  "Draft",
  "PendingApproval",
  "Approved",
  "Rejected",
  "Cancelled",
] as const
