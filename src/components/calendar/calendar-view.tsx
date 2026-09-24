"use client"

import { useRef, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import multiMonthPlugin from "@fullcalendar/multimonth"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventClickArg } from "@fullcalendar/core"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EventDetailDialog, type CalendarEvent } from "@/components/events/event-detail-dialog"
import { toEventInput, holidayToEventInput } from "@/lib/calendar-mapping"
import type { PublicHoliday } from "@/lib/holidays"

const VIEW_MAP = {
  year: "multiMonthYear",
  month: "dayGridMonth",
  week: "timeGridWeek",
  day: "timeGridDay",
} as const

type ViewKey = keyof typeof VIEW_MAP

export function CalendarView() {
  const calendarRef = useRef<FullCalendar>(null)
  const [view, setView] = useState<ViewKey>("month")
  const [selected, setSelected] = useState<CalendarEvent | null>(null)

  function handleViewChange(next: string) {
    const key = next as ViewKey
    setView(key)
    calendarRef.current?.getApi().changeView(VIEW_MAP[key])
  }

  function handleEventClick(info: EventClickArg) {
    if (info.event.extendedProps.isHoliday) return
    setSelected(info.event.extendedProps as CalendarEvent)
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={view} onValueChange={handleViewChange}>
        <TabsList>
          <TabsTrigger value="year">Year</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="day">Day</TabsTrigger>
        </TabsList>
      </Tabs>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, listPlugin, interactionPlugin]}
        initialView={VIEW_MAP[view]}
        timeZone="local"
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        height="auto"
        eventClick={handleEventClick}
        events={(fetchInfo, successCallback, failureCallback) => {
          // Use URLSearchParams rather than raw template interpolation: FullCalendar's
          // startStr/endStr include a "+HH:MM" timezone offset (e.g. "...T00:00:00+03:00"),
          // and an un-encoded "+" in a query string is decoded as a space, corrupting the
          // date and causing every request to 500 for anyone in a positive-offset timezone.
          const params = new URLSearchParams({ from: fetchInfo.startStr, to: fetchInfo.endStr })
          Promise.all([
            fetch(`/api/events?${params}`).then((res) => res.json()) as Promise<CalendarEvent[]>,
            fetch(`/api/holidays?${params}`).then((res) => res.json()) as Promise<PublicHoliday[]>,
          ])
            .then(([events, holidays]) =>
              successCallback([...events.map(toEventInput), ...holidays.map(holidayToEventInput)])
            )
            .catch(failureCallback)
        }}
      />

      <EventDetailDialog event={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}
