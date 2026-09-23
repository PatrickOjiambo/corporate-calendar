import { z } from "zod"
import { EVENT_AUDIENCES, EVENT_CATEGORIES } from "@/lib/constants"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

export const createEventSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(2000).optional(),
    allDay: z.boolean().default(false),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    timezone: z.string().min(1, "Timezone is required"),
    venue: objectId,
    organizerEmail: z.string().email("Enter a valid email"),
    meetingLink: z.string().url("Enter a valid URL").optional(),
    organizingDepartment: objectId,
    category: z.enum(EVENT_CATEGORIES),
    audience: z.enum(EVENT_AUDIENCES).default("EntireOrganization"),
    audienceDepartments: z.array(objectId).optional(),
  })
  .refine((data) => data.endAt >= data.startAt, {
    message: "End must be on or after start",
    path: ["endAt"],
  })
  .refine(
    (data) =>
      !["Department", "SpecificDepartments"].includes(data.audience) ||
      (data.audienceDepartments?.length ?? 0) > 0,
    {
      message: "Select at least one department for this audience",
      path: ["audienceDepartments"],
    }
  )

export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  allDay: z.boolean().optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  timezone: z.string().min(1).optional(),
  venue: objectId.optional(),
  organizerEmail: z.string().email().optional(),
  meetingLink: z.string().url().optional(),
  organizingDepartment: objectId.optional(),
  category: z.enum(EVENT_CATEGORIES).optional(),
  audience: z.enum(EVENT_AUDIENCES).optional(),
  audienceDepartments: z.array(objectId).optional(),
})

export const rejectEventSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(1000),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type RejectEventInput = z.infer<typeof rejectEventSchema>
