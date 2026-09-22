import { z } from "zod"
import { USER_ROLES } from "@/lib/constants"

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(USER_ROLES).default("user"),
  department: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid id")
    .optional(),
})

export const updateUserSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  department: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid id")
    .optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
