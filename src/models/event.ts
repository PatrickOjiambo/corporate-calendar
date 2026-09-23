import { Schema, model, models, type InferSchemaType } from "mongoose"
import { EVENT_CATEGORIES, EVENT_AUDIENCES, EVENT_STATUSES } from "@/lib/constants"

export { EVENT_CATEGORIES, EVENT_AUDIENCES, EVENT_STATUSES }

const eventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    allDay: { type: Boolean, default: false },
    // UTC instant. For allDay events: UTC midnight of the start/end calendar date
    // (timezone-independent — an all-day event shows the same dates to every viewer).
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    // IANA tz the organizer entered times in / the venue's tz. Kept for allDay events
    // too (for venue context) but never used to shift their dates.
    timezone: { type: String, required: true },
    venue: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    // Required contact for the person organizing the event, shown to admins
    // reviewing it and to viewers on the public detail dialog.
    organizerEmail: { type: String, required: true },
    // Only meaningful when venue.isOnline is true.
    meetingLink: { type: String },
    organizingDepartment: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    category: { type: String, enum: EVENT_CATEGORIES, required: true },
    audience: { type: String, enum: EVENT_AUDIENCES, required: true, default: "EntireOrganization" },
    audienceDepartments: [{ type: Schema.Types.ObjectId, ref: "Department" }],
    status: { type: String, enum: EVENT_STATUSES, default: "Draft" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
)

eventSchema.index({ status: 1, startAt: 1 })
eventSchema.index({ audience: 1, status: 1 })
eventSchema.index({ createdBy: 1, status: 1 })
eventSchema.index({ organizingDepartment: 1 })

export type EventDoc = InferSchemaType<typeof eventSchema>
export const Event = models.Event ?? model("Event", eventSchema)
