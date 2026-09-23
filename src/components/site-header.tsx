import Image from "next/image"
import Link from "next/link"
import { UserNav } from "@/components/auth/user-nav"

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="h-1 bg-gradient-to-r from-brand-red via-brand-red to-brand-navy" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/kenya-re-logo.png"
            alt="Kenya Re"
            width={595}
            height={316}
            priority
            className="h-9 w-auto"
          />
          <span className="hidden border-l pl-3 text-sm font-medium text-muted-foreground sm:block">
            Corporate Calendar
          </span>
        </Link>
        <UserNav />
      </div>
    </header>
  )
}
