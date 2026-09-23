import { z } from "zod"

export const createVenueSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  location: z.string().max(500).optional(),
  capacity: z.coerce.number().int().positive().optional(),
  timezone: z.string().min(1, "Timezone is required"),
  isOnline: z.boolean().default(false),
})

export const updateVenueSchema = createVenueSchema.partial()

export type CreateVenueInput = z.infer<typeof createVenueSchema>
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>
