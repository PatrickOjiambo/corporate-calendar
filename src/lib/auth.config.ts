import type { NextAuthConfig, DefaultSession } from "next-auth"
import type { UserRole } from "@/models/user"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      department: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role?: UserRole
    department?: string | null
  }
}

export type AppToken = {
  id?: string
  role?: UserRole
  department?: string | null
  iat?: number
}

/**
 * Edge-safe config: no providers (they touch Mongoose/bcrypt, which need the
 * Node runtime) and no DB calls in callbacks. Used directly by middleware.ts.
 * `auth.ts` extends this with the real Credentials provider and a
 * DB-refreshing jwt callback for use in route handlers/server components.
 */
export const authConfig = {
  session: { strategy: "jwt", updateAge: 60 * 60 * 24 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      const t = token as AppToken
      session.user.id = t.id ?? ""
      session.user.role = t.role ?? "user"
      session.user.department = t.department ?? null
      return session
    },
  },
} satisfies NextAuthConfig
