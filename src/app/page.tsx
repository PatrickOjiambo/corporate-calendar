import { CalendarView } from "@/components/calendar/calendar-view"

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-navy">Corporate Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Organization-wide events across Kenya, Zambia, and C&ocirc;te d&apos;Ivoire
        </p>
      </div>
      <CalendarView />
    </div>
  )
}
