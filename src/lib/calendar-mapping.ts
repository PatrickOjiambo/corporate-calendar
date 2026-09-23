import type { EventInput } from "@fullcalendar/core"
import { addDays } from "date-fns"
import type { CalendarEvent } from "@/components/events/event-detail-dialog"

// A palette of distinct, readable colors — one is assigned per event (not
// per category) so a busy day doesn't turn into a wall of same-colored bars.
const EVENT_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-600",
  "bg-fuchsia-500",
  "bg-indigo-500",
  "bg-lime-600",
  "bg-orange-500",
  "bg-teal-500",
  "bg-pink-500",
]

/** Deterministic per-event color: same event always gets the same color, picked from the palette by hashing its id. */
function colorForEvent(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length]
}

/**
 * Maps an API event to FullCalendar's EventInput shape.
 *
 * The one subtlety here: FullCalendar treats `end` as exclusive for allDay
 * events (an allDay event running Oct 7-9 inclusive needs `end: Oct 10`, or
 * it renders one day short / clips the last day). Our API stores `endAt` as
 * the inclusive last day, so allDay events need +1 day added on the way out.
 * Timed events are NOT adjusted — their `endAt` is already a real instant.
 */
export function toEventInput(event: CalendarEvent): EventInput {
  return {
    id: event._id,
    title: event.title,
    start: event.startAt,
    end: event.allDay ? addDays(new Date(event.endAt), 1) : event.endAt,
    allDay: event.allDay,
    className: colorForEvent(event._id),
    extendedProps: event,
  }
}
