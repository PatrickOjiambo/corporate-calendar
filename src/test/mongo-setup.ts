import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"

let mongod: MongoMemoryServer | null = null

/**
 * Starts an in-memory MongoDB instance and connects via the app's own
 * connectToDatabase() (by setting MONGODB_URI first), rather than calling
 * mongoose.connect() directly — so route handlers under test, which call
 * connectToDatabase() themselves, share the same cached connection instead
 * of throwing "Missing MONGODB_URI" or opening a second connection.
 */
export async function startTestDatabase() {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  const { connectToDatabase } = await import("@/lib/db")
  await connectToDatabase()
}

/** Disconnects Mongoose and stops the in-memory instance. Call from afterAll. */
export async function stopTestDatabase() {
  await mongoose.disconnect()
  await mongod?.stop()
  mongod = null
}

/** Drops all collections between tests so fixtures don't leak across cases. Call from afterEach. */
export async function clearTestDatabase() {
  const collections = mongoose.connection.collections
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})))
}
