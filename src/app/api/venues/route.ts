import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { Venue } from "@/models/venue"
import { createVenueSchema } from "@/lib/validators/venue"

export async function GET() {
  await connectToDatabase()
  const venues = await Venue.find().sort({ name: 1 }).lean()
  return NextResponse.json(venues)
}

export async function POST(request: Request) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createVenueSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectToDatabase()
  const venue = await Venue.create(parsed.data)
  return NextResponse.json(venue, { status: 201 })
}
