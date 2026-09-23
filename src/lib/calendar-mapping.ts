import type { EventInput } from "@fullcalendar/core"
import { addDays } from "date-fns"
import type { CalendarEvent } from "@/components/events/event-detail-dialog"

export const CATEGORY_CLASS: Record<string, string> = {
  Meeting: "bg-blue-500",
  Training: "bg-emerald-500",
  Workshop: "bg-emerald-500",
  Conference: "bg-purple-500",
  "Staff Activity": "bg-amber-500",
  "Corporate Event": "bg-rose-500",
  Deadline: "bg-red-600",
  Other: "bg-slate-500",
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
    className: CATEGORY_CLASS[event.category] ?? "bg-slate-500",
    extendedProps: event,
  }
}
