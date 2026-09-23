import { Schema, model, models, type InferSchemaType } from "mongoose"

export const AUDIT_ACTIONS = [
  "created",
  "submitted",
  "approved",
  "rejected",
  "edited",
  "cancelled",
] as const

const auditLogSchema = new Schema(
  {
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    // No actor for anonymous submissions — the submitter's IP/email live in
    // metadata instead.
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema>
export const AuditLog = models.AuditLog ?? model("AuditLog", auditLogSchema)

export async function writeAuditLog(entry: {
  entityType: string
  entityId: unknown
  action: (typeof AUDIT_ACTIONS)[number]
  actor?: unknown
  metadata?: unknown
}) {
  await AuditLog.create(entry)
}
