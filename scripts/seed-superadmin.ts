import bcrypt from "bcryptjs"
import { connectToDatabase } from "@/lib/db"
import { User } from "@/models/user"

async function main() {
  const email = process.env.SEED_SUPERADMIN_EMAIL
  const password = process.env.SEED_SUPERADMIN_PASSWORD

  if (!email || !password) {
    throw new Error("SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD are required")
  }

  await connectToDatabase()

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    console.log(`Superadmin ${email} already exists, skipping.`)
    process.exit(0)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await User.create({
    name: "Superadmin",
    email: email.toLowerCase(),
    passwordHash,
    role: "superadmin",
  })

  console.log(`Superadmin ${email} created.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
