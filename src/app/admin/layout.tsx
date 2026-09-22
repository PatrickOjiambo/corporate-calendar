import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== "admin" && role !== "superadmin") {
    redirect("/")
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
      <nav className="flex w-48 shrink-0 flex-col gap-2 text-sm">
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/approvals">Approvals</Link>
        <Link href="/admin/departments">Departments</Link>
        <Link href="/admin/venues">Venues</Link>
        {role === "superadmin" && <Link href="/admin/users">Users</Link>}
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  )
}
