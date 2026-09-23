import Link from "next/link"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { Event } from "@/models/event"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function AdminDashboardPage() {
  const session = await auth()
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
    { label: "Pending approvals", value: pending, href: "/admin/approvals" },
    { label: "Events this week", value: thisWeek, href: "/" },
    { label: "Events this month", value: thisMonth, href: "/" },
    { label: "Upcoming events", value: upcoming, href: "/" },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {session?.user?.role === "superadmin" && (
          <Button render={<Link href="/admin/users">Manage admins</Link>} nativeButton={false} />
        )}
      </div>

      {pending > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-brand-red/30 bg-accent px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">{pending}</span> event{pending === 1 ? "" : "s"}{" "}
            waiting for approval.
          </p>
          <Button
            size="sm"
            render={<Link href="/admin/approvals">Review now</Link>}
            nativeButton={false}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="text-sm font-normal text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{stat.value}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
