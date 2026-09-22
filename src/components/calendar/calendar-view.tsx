"use client"

import { useRef, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import multiMonthPlugin from "@fullcalendar/multimonth"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventClickArg, EventInput } from "@fullcalendar/core"
import { addDays } from "date-fns"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EventDetailDialog, type CalendarEvent } from "@/components/events/event-detail-dialog"

const VIEW_MAP = {
  year: "multiMonthYear",
  month: "dayGridMonth",
  week: "timeGridWeek",
  day: "timeGridDay",
} as const

type ViewKey = keyof typeof VIEW_MAP

const CATEGORY_CLASS: Record<string, string> = {
  Meeting: "bg-blue-500",
  Training: "bg-emerald-500",
  Workshop: "bg-emerald-500",
  Conference: "bg-purple-500",
  "Staff Activity": "bg-amber-500",
  "Corporate Event": "bg-rose-500",
  Deadline: "bg-red-600",
  Other: "bg-slate-500",
}

function toEventInput(event: CalendarEvent): EventInput {
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
          fetch(`/api/events?from=${fetchInfo.startStr}&to=${fetchInfo.endStr}`)
            .then((res) => res.json())
            .then((events: CalendarEvent[]) => successCallback(events.map(toEventInput)))
            .catch(failureCallback)
        }}
      />

      <EventDetailDialog event={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}
