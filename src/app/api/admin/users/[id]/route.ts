import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { User } from "@/models/user"
import { updateUserSchema } from "@/lib/validators/auth"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (session?.user?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectToDatabase()
  const user = await User.findByIdAndUpdate(id, parsed.data, {
    returnDocument: "after",
  }).select("-passwordHash")
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(user)
}
