import type { EventInput } from "@fullcalendar/core"
import { addDays } from "date-fns"
import type { CalendarEvent } from "@/components/events/event-detail-dialog"
import { HOLIDAY_COUNTRIES, type PublicHoliday } from "@/lib/holidays"

// Reverse lookup (display name -> ISO code) so holiday banners can show the
// short code instead of the full country name - some holiday names are
// already long, and spelling out multiple full country names on top of that
// doesn't fit well on a calendar bar.
const COUNTRY_CODE_BY_NAME = Object.fromEntries(
  Object.entries(HOLIDAY_COUNTRIES).map(([code, name]) => [name, code])
)

// A palette of distinct, readable colors — one is assigned per event (not
// per category) so a busy day doesn't turn into a wall of same-colored bars.
// Hex values (matching this app's Tailwind theme, not stock Tailwind
// defaults), not Tailwind class names: FullCalendar injects its own default
// .fc-event background at runtime, which wins the cascade over a plain
// className with equal specificity. backgroundColor/borderColor are applied
// by FullCalendar as inline styles, which always win instead.
// Lightened (mixed ~65% with white) from the theme's base 500/600 shades so
// black event text stays readable — the base shades are saturated enough
// that black text on them fails contrast.
const EVENT_COLORS = [
  "#b7d3ff", // blue-500, lightened
  "#a6e7d2", // emerald-500, lightened
  "#e2c0ff", // purple-500, lightened
  "#fddca6", // amber-500, lightened
  "#ffb2c4", // rose-500, lightened
  "#a6d9e5", // cyan-600, lightened
  "#f5b4fe", // fuchsia-500, lightened
  "#c8c7ff", // indigo-500, lightened
  "#c8dfa6", // lime-600, lightened
  "#ffcca6", // orange-500, lightened
  "#a6e7e0", // teal-500, lightened
  "#fcb8dc", // pink-500, lightened
]

/** Deterministic per-event color: same event always gets the same color, picked from the palette by hashing its id. */
function colorForEvent(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length]
}

/** Same venue/location logic as the event detail dialog, so the banner and the dialog never disagree. */
function venueLabel(event: CalendarEvent): string | null {
  if (!event.venue) return null
  if (event.venue.allowsCustomLocation && event.customLocation) return event.customLocation
  return `${event.venue.name}${event.venue.location ? `, ${event.venue.location}` : ""}`
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
  const venue = venueLabel(event)
  return {
    id: event._id,
    title: venue ? `${event.title}, ${venue}` : event.title,
    start: event.startAt,
    end: event.allDay ? addDays(new Date(event.endAt), 1) : event.endAt,
    allDay: event.allDay,
    backgroundColor: color,
    borderColor: color,
    extendedProps: event,
  }
}

// Neutral, deliberately unsaturated styling — visually distinct from the
// vibrant per-event palette above, so a holiday reads as "not a Kenya Re
// event" at a glance rather than competing with real organizational events.
const HOLIDAY_COLOR = "#e5e7eb"

/**
 * Maps a public holiday to FullCalendar's EventInput shape. Holidays are
 * single-day allDay entries, so `end` needs the same +1 day exclusive-end
 * adjustment as allDay events in toEventInput above.
 */
export function holidayToEventInput(holiday: PublicHoliday): EventInput {
  const codes = holiday.countries.map((c) => COUNTRY_CODE_BY_NAME[c] ?? c)
  const title =
    codes.length > 1 ? `${holiday.name} — ${codes.join(", ")}` : `${holiday.name} (${codes[0]})`
  return {
    id: `holiday-${holiday.date}-${holiday.name}`,
    title,
    start: holiday.date,
    end: addDays(new Date(holiday.date), 1),
    allDay: true,
    backgroundColor: HOLIDAY_COLOR,
    borderColor: HOLIDAY_COLOR,
    textColor: "#000",
    editable: false,
    extendedProps: { isHoliday: true, countries: holiday.countries },
  }
}
