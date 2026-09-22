import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { Department } from "@/models/department"
import { createDepartmentSchema } from "@/lib/validators/department"

export async function GET() {
  await connectToDatabase()
  const departments = await Department.find().sort({ name: 1 }).lean()
  return NextResponse.json(departments)
}

export async function POST(request: Request) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createDepartmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectToDatabase()
  const department = await Department.create(parsed.data)
  return NextResponse.json(department, { status: 201 })
}
