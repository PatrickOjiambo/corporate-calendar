import type { EventInput } from "@fullcalendar/core"
import { addDays } from "date-fns"
import type { CalendarEvent } from "@/components/events/event-detail-dialog"

// A palette of distinct, readable colors — one is assigned per event (not
// per category) so a busy day doesn't turn into a wall of same-colored bars.
// Hex values (matching this app's Tailwind theme, not stock Tailwind
// defaults), not Tailwind class names: FullCalendar injects its own default
// .fc-event background at runtime, which wins the cascade over a plain
// className with equal specificity. backgroundColor/borderColor are applied
// by FullCalendar as inline styles, which always win instead.
const EVENT_COLORS = [
  "#3080ff", // blue-500
  "#00bb7f", // emerald-500
  "#ac4bff", // purple-500
  "#f99c00", // amber-500
  "#ff2357", // rose-500
  "#0092b5", // cyan-600
  "#e12afb", // fuchsia-500
  "#625fff", // indigo-500
  "#62a400", // lime-600
  "#fe6e00", // orange-500
  "#00baa7", // teal-500
  "#f6339a", // pink-500
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
  const color = colorForEvent(event._id)
  return {
    id: event._id,
    title: event.title,
    start: event.startAt,
    end: event.allDay ? addDays(new Date(event.endAt), 1) : event.endAt,
    allDay: event.allDay,
    backgroundColor: color,
    borderColor: color,
    extendedProps: event,
  }
}
