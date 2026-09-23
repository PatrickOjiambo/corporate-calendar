import { connectToDatabase } from "@/lib/db"
import { Event } from "@/models/event"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApprovalActions } from "@/components/admin/approval-actions"
import { formatViewerLocal } from "@/lib/timezone"

export default async function ApprovalsPage() {
  await connectToDatabase()
  const events = await Event.find({ status: "PendingApproval" })
    .sort({ createdAt: 1 })
    .populate("venue", "name")
    .populate("organizingDepartment", "name")
    .populate("createdBy", "name")
    .lean()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Pending approvals</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Submitted by</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>When</TableHead>
            <TableHead>Audience</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event._id.toString()}>
              <TableCell>{event.title}</TableCell>
              <TableCell>
                {(event.createdBy as unknown as { name: string } | null)?.name ?? "—"}
              </TableCell>
              <TableCell>
                <a href={`mailto:${event.organizerEmail}`} className="underline">
                  {event.organizerEmail}
                </a>
              </TableCell>
              <TableCell>
                {event.allDay
                  ? new Date(event.startAt).toLocaleDateString()
                  : formatViewerLocal(event.startAt, "PPp")}
              </TableCell>
              <TableCell>{event.audience}</TableCell>
              <TableCell>
                <ApprovalActions eventId={event._id.toString()} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
