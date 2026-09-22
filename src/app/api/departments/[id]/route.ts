import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { Department } from "@/models/department"
import { updateDepartmentSchema } from "@/lib/validators/department"
import { Event } from "@/models/event"

type Params = { params: Promise<{ id: string }> }

function requireAdmin(role: string | undefined) {
  return role === "admin" || role === "superadmin"
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const session = await auth()
  if (!requireAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateDepartmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectToDatabase()
  const department = await Department.findByIdAndUpdate(id, parsed.data, { new: true })
  if (!department) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(department)
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const session = await auth()
  if (!requireAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await connectToDatabase()
  const inUse = await Event.exists({
    $or: [{ organizingDepartment: id }, { audienceDepartments: id }],
  })
  if (inUse) {
    return NextResponse.json(
      { error: "Department is referenced by existing events" },
      { status: 409 }
    )
  }

  const department = await Department.findByIdAndDelete(id)
  if (!department) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
