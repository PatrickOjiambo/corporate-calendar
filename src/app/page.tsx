import { CalendarView } from "@/components/calendar/calendar-view"

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Kenya Re Corporate Calendar</h1>
      <CalendarView />
    </div>
  )
}
