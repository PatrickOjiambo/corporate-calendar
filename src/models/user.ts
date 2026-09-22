import { Schema, model, models, type InferSchemaType } from "mongoose"
import { USER_ROLES, type UserRole } from "@/lib/constants"

export { USER_ROLES }
export type { UserRole }

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: "user" },
    department: { type: Schema.Types.ObjectId, ref: "Department" },
  },
  { timestamps: true }
)

export type UserDoc = InferSchemaType<typeof userSchema>
export const User = models.User ?? model("User", userSchema)
