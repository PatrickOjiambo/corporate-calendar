import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Event } from "@/models/event"
import { eventSchema } from "@/lib/validators/event"

export async function GET() {
  await connectToDatabase()
  const events = await Event.find().sort({ startsAt: 1 }).lean()
  return NextResponse.json(events)
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = eventSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectToDatabase()
  const event = await Event.create(parsed.data)
  return NextResponse.json(event, { status: 201 })
}
