import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { User } from "@/models/user"
import { createUserSchema } from "@/lib/validators/auth"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await connectToDatabase()
  const users = await User.find().select("-passwordHash").sort({ name: 1 }).lean()
  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const session = await auth()
  if (session?.user?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectToDatabase()
  const existing = await User.findOne({ email: parsed.data.email.toLowerCase() })
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    passwordHash,
    role: parsed.data.role,
    department: parsed.data.department,
  })

  return NextResponse.json({ ...user.toObject(), passwordHash: undefined }, { status: 201 })
}
