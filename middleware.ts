import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "@/lib/auth.config"

const { auth } = NextAuth(authConfig)

const ADMIN_PATHS = ["/admin"]
const SUPERADMIN_PATHS = ["/admin/users"]
const AUTH_PATHS = ["/submit-event", "/my-events"]

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

  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
