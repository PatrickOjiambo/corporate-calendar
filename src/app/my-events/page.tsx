import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { Event } from "@/models/event"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatViewerLocal } from "@/lib/timezone"

export default async function MyEventsPage() {
  const session = await auth()
  await connectToDatabase()

  const events = session?.user
    ? await Event.find({ createdBy: session.user.id })
        .sort({ createdAt: -1 })
        .populate("venue", "name")
        .lean()
    : []

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">My events</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>When</TableHead>
            <TableHead>Venue</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event._id.toString()}>
              <TableCell>{event.title}</TableCell>
              <TableCell>
                {event.allDay
                  ? new Date(event.startAt).toLocaleDateString()
                  : formatViewerLocal(event.startAt, "PPp")}
              </TableCell>
              <TableCell>
                {(event.venue as unknown as { name: string } | null)?.name ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={event.status === "Rejected" ? "destructive" : "secondary"}>
                  {event.status}
                </Badge>
              </TableCell>
              <TableCell>{event.rejectionReason ?? ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
