import { EventForm } from "@/components/events/event-form"

export default function SubmitEventPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Submit an event</h1>
      <EventForm mode="create" />
    </div>
  )
}
