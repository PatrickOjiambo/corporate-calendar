import { Schema, model, models, type InferSchemaType } from "mongoose"

const venueSchema = new Schema(
  {
    name: { type: String, required: true },
    location: { type: String },
    capacity: { type: Number },
    // IANA timezone, e.g. "Africa/Nairobi" — default source for an event's timezone
    timezone: { type: String, required: true },
  },
  { timestamps: true }
)

export type VenueDoc = InferSchemaType<typeof venueSchema>
export const Venue = models.Venue ?? model("Venue", venueSchema)
