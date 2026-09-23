"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// No public sign-in entry point — admins reach /login by typing it directly.
// Renders nothing for anonymous visitors, an admin menu once signed in.
export function UserNav() {
  const { data: session, status } = useSession()

  if (status === "loading" || !session?.user) return null

  const { name, role } = session.user
  const initials = (name ?? "?").slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="gap-2">
            <Avatar size="sm">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {name}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">{role}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/admin">Admin dashboard</Link>} />
        <DropdownMenuItem render={<Link href="/admin/approvals">Pending approvals</Link>} />
        {role === "superadmin" && (
          <DropdownMenuItem render={<Link href="/admin/users">Manage admins</Link>} />
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
