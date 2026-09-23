import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { Event } from "@/models/event"
import { createEventSchema } from "@/lib/validators/event"
import { writeAuditLog } from "@/models/audit-log"
import { visibilityFilter } from "@/lib/event-visibility"

export async function GET(request: Request) {
  const session = await auth()
  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const status = searchParams.get("status")
  const mine = searchParams.get("mine") === "true"

  await connectToDatabase()

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "superadmin"
  const filter: Record<string, unknown> = isAdmin ? {} : visibilityFilter(session)

  if (mine && session?.user) {
    filter.createdBy = session.user.id
  }
  if (status && (isAdmin || mine)) {
    filter.status = status
  }
  if (from || to) {
    const range: Record<string, Date> = {}
    if (from) range.$gte = new Date(from)
    if (to) range.$lte = new Date(to)
    filter.startAt = range
  }

  const events = await Event.find(filter)
    .sort({ startAt: 1 })
    .populate("venue", "name location timezone isOnline")
    .populate("organizingDepartment", "name")
    .lean()

  return NextResponse.json(events)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectToDatabase()
  const event = await Event.create({
    ...parsed.data,
    status: "PendingApproval",
    createdBy: session.user.id,
  })

  await writeAuditLog({
    entityType: "Event",
    entityId: event._id,
    action: "submitted",
    actor: session.user.id,
  })

  return NextResponse.json(event, { status: 201 })
}
