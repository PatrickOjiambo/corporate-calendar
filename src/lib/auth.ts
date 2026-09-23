import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { connectToDatabase } from "@/lib/db"
import { User, type UserRole } from "@/models/user"
import { authConfig, type AppToken } from "@/lib/auth.config"
import { isTokenStale } from "@/lib/auth-token"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password
        if (typeof email !== "string" || typeof password !== "string") return null

        await connectToDatabase()
        const user = await User.findOne({ email: email.toLowerCase() })
        if (!user) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          department: user.department ? user.department.toString() : null,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      const t = token as AppToken

      if (user) {
        t.id = user.id
        t.role = user.role
        t.department = user.department ?? null
        return t
      }

      // Re-check role/department against the DB once a day so role changes
      // propagate without requiring a DB hit on every single request.
      if ((isTokenStale(t.iat ?? 0) || !t.role) && t.id) {
        await connectToDatabase()
        const fresh = await User.findById(t.id)
        if (fresh) {
          t.role = fresh.role as UserRole
          t.department = fresh.department ? fresh.department.toString() : null
        }
      }
      return t
    },
  },
})
