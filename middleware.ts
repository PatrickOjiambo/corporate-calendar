import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "@/lib/auth.config"

const { auth } = NextAuth(authConfig)

const ADMIN_PATHS = ["/admin"]
const SUPERADMIN_PATHS = ["/admin/users"]

// Everything else — including /submit-event — is public. There are no
// regular logged-in users in this system, only admins/superadmins, who reach
// /login by typing it directly rather than via any link in the UI.
export default auth((req) => {
  const { pathname } = req.nextUrl
  const role = req.auth?.user?.role

  if (SUPERADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== "superadmin") {
      return NextResponse.redirect(new URL("/", req.url))
    }
    return NextResponse.next()
  }

  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.redirect(new URL("/", req.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
