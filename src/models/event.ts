import { Schema, model, models, type InferSchemaType } from "mongoose"

const eventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    location: { type: String },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export type EventDoc = InferSchemaType<typeof eventSchema>
export const Event = models.Event ?? model("Event", eventSchema)
