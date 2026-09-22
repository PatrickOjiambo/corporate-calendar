import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { Event } from "@/models/event"
import { rejectEventSchema } from "@/lib/validators/event"
import { writeAuditLog } from "@/models/audit-log"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const role = session?.user?.role
  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = rejectEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectToDatabase()
  const event = await Event.findById(id)
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  event.status = "Rejected"
  event.rejectionReason = parsed.data.reason
  await event.save()

  await writeAuditLog({
    entityType: "Event",
    entityId: event._id,
    action: "rejected",
    actor: session!.user.id,
    metadata: { reason: parsed.data.reason },
  })

  return NextResponse.json(event)
}
