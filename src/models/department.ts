import { Schema, model, models, type InferSchemaType } from "mongoose"

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
  },
  { timestamps: true }
)

export type DepartmentDoc = InferSchemaType<typeof departmentSchema>
export const Department = models.Department ?? model("Department", departmentSchema)
