import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { Event } from "@/models/event"
import { updateEventSchema } from "@/lib/validators/event"
import { writeAuditLog } from "@/models/audit-log"
import { visibilityFilter } from "@/lib/event-visibility"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const { id } = await params
  const session = await auth()
  await connectToDatabase()

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "superadmin"
  const filter = isAdmin ? { _id: id } : { _id: id, ...visibilityFilter(session) }

  const event = await Event.findOne(filter)
    .populate("venue", "name location timezone")
    .populate("organizingDepartment", "name")

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(event)
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectToDatabase()
  const event = await Event.findById(id)
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const isAdmin = session.user.role === "admin" || session.user.role === "superadmin"
  const isOwner = event.createdBy.toString() === session.user.id
  const ownerCanEdit = isOwner && ["Draft", "PendingApproval"].includes(event.status)

  if (!isAdmin && !ownerCanEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  Object.assign(event, parsed.data)
  await event.save()

  await writeAuditLog({
    entityType: "Event",
    entityId: event._id,
    action: "edited",
    actor: session.user.id,
    metadata: parsed.data,
  })

  return NextResponse.json(event)
}
