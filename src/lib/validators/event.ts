import { z } from "zod"

export const eventSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(2000).optional(),
    location: z.string().max(200).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    allDay: z.boolean().default(false),
  })
  .refine((data) => data.endsAt >= data.startsAt, {
    message: "End time must be after start time",
    path: ["endsAt"],
  })

export type EventInput = z.infer<typeof eventSchema>
