import { connectToDatabase } from "@/lib/db"
import { Event } from "@/models/event"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminDashboardPage() {
  await connectToDatabase()

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [pending, thisWeek, thisMonth, upcoming] = await Promise.all([
    Event.countDocuments({ status: "PendingApproval" }),
    Event.countDocuments({ status: "Approved", startAt: { $gte: startOfWeek } }),
    Event.countDocuments({ status: "Approved", startAt: { $gte: startOfMonth } }),
    Event.countDocuments({ status: "Approved", startAt: { $gte: now } }),
  ])

  const stats = [
    { label: "Pending approvals", value: pending },
    { label: "Events this week", value: thisWeek },
    { label: "Events this month", value: thisMonth },
    { label: "Upcoming events", value: upcoming },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{stat.value}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
