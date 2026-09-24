import { NextResponse } from "next/server"
import { getPublicHolidays } from "@/lib/holidays"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const fromYear = from ? new Date(from).getUTCFullYear() : new Date().getUTCFullYear()
  const toYear = to ? new Date(to).getUTCFullYear() : fromYear

  if ([fromYear, toYear].some((y) => Number.isNaN(y))) {
    return NextResponse.json({ error: "Invalid from/to date" }, { status: 400 })
  }

  const holidays = getPublicHolidays(fromYear, toYear).filter((h) => {
    if (from && h.date < from.slice(0, 10)) return false
    if (to && h.date > to.slice(0, 10)) return false
    return true
  })

  return NextResponse.json(holidays)
}
