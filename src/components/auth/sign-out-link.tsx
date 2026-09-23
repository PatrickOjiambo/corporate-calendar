"use client"

import { signOut } from "next-auth/react"

export function SignOutLink() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-left text-destructive hover:underline"
    >
      Sign out
    </button>
  )
}
