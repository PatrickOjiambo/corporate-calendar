"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatViewerLocal, formatOriginalTimezone } from "@/lib/timezone"
import { format } from "date-fns"

export type CalendarEvent = {
  _id: string
  title: string
  description?: string
  allDay: boolean
  startAt: string
  endAt: string
  timezone: string
  category: string
  audience: string
  status: string
  organizerEmail?: string
  meetingLink?: string
  venue?: { name: string; location?: string; isOnline?: boolean } | null
  organizingDepartment?: { name: string } | null
}

export function EventDetailDialog({
  event,
  onOpenChange,
}: {
  event: CalendarEvent | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!event} onOpenChange={onOpenChange}>
      <DialogContent>
        {event && (
          <>
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
              <DialogDescription>
                {event.allDay ? (
                  <>
                    {format(new Date(event.startAt), "PPP")}
                    {event.startAt !== event.endAt && (
                      <> – {format(new Date(event.endAt), "PPP")}</>
                    )}
                    {" · Whole day"}
                  </>
                ) : (
                  <>
                    {formatViewerLocal(event.startAt, "PPp")} –{" "}
                    {formatViewerLocal(event.endAt, "p")} (your time)
                    <br />
                    Originally {formatOriginalTimezone(event.startAt, event.timezone)}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{event.category}</Badge>
              <Badge variant="outline">{event.audience}</Badge>
              {event.status !== "Approved" && <Badge>{event.status}</Badge>}
            </div>

            {event.venue && (
              <p className="text-sm text-muted-foreground">
                📍 {event.venue.name}
                {event.venue.location ? `, ${event.venue.location}` : ""}
              </p>
            )}

            {event.meetingLink && (
              <p className="text-sm">
                🔗{" "}
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Join online
                </a>
              </p>
            )}

            {event.organizingDepartment && (
              <p className="text-sm text-muted-foreground">
                Organized by {event.organizingDepartment.name}
              </p>
            )}

            {event.organizerEmail && (
              <p className="text-sm text-muted-foreground">
                Contact:{" "}
                <a href={`mailto:${event.organizerEmail}`} className="underline">
                  {event.organizerEmail}
                </a>
              </p>
            )}

            {event.description && <p className="text-sm">{event.description}</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
