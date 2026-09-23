import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { Event } from "@/models/event"
import { createEventSchema } from "@/lib/validators/event"
import { writeAuditLog } from "@/models/audit-log"
import { visibilityFilter } from "@/lib/event-visibility"
import { getRequestIp } from "@/lib/request-ip"

export async function GET(request: Request) {
  const session = await auth()
  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const status = searchParams.get("status")

  await connectToDatabase()

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "superadmin"
  const filter: Record<string, unknown> = visibilityFilter(session)

  if (status && isAdmin) {
    filter.status = status
  }
  if (from || to) {
    const range: Record<string, Date> = {}
    if (from) range.$gte = new Date(from)
    if (to) range.$lte = new Date(to)

    // A malformed/under-encoded query (e.g. a literal "+" decoded as a space
    // in a timezone offset) produces an Invalid Date, which would otherwise
    // crash Mongoose's cast with a 500 — fail cleanly with 400 instead.
    if (Object.values(range).some((d) => Number.isNaN(d.getTime()))) {
      return NextResponse.json({ error: "Invalid from/to date" }, { status: 400 })
    }

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
  // No login required — anyone on the Kenya Re network can submit an event.
  // Admins/superadmins review and approve. If the submitter happens to be
  // logged in as an admin, we still record them as the creator.
  const session = await auth()

  const body = await request.json()
  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectToDatabase()
  const event = await Event.create({
    ...parsed.data,
    status: "PendingApproval",
    createdBy: session?.user?.id,
    submitterIp: getRequestIp(request),
  })

  await writeAuditLog({
    entityType: "Event",
    entityId: event._id,
    action: "submitted",
    actor: session?.user?.id,
    metadata: { organizerEmail: parsed.data.organizerEmail, ip: event.submitterIp },
  })

  return NextResponse.json(event, { status: 201 })
}
