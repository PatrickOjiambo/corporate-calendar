import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/auth/user-nav"

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="h-1 bg-gradient-to-r from-brand-red via-brand-red to-brand-navy" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-4">
          <Image
            src="/brand/kenya-re-logo.png"
            alt="Kenya Re"
            width={595}
            height={316}
            priority
            className="h-14 w-auto"
          />
          <span className="border-l pl-4 text-xl font-bold text-brand-navy">
            Corporate Calendar
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Button render={<Link href="/submit-event">Create Event</Link>} nativeButton={false} />
          <UserNav />
        </div>
      </div>
    </header>
  )
}
