import mongoose from "mongoose"

// Side-effect imports: registers every Mongoose model as soon as anything
// calls connectToDatabase(), regardless of which model(s) that particular
// route imports directly. Without this, a route that only imports Event and
// calls .populate("venue")/.populate("organizingDepartment") can hit
// MissingSchemaError — Next.js's per-route bundling can give each route its
// own isolated module graph, so Venue/Department being registered by some
// *other* route earlier in the process's life is not guaranteed. Verified in
// production: /api/events 500'd with "Schema hasn't been registered for
// model Venue" until /api/venues or /api/departments happened to be hit
// first in that process — intermittent and dependent on request order,
// worst right after a fresh deploy/restart before anything has warmed it up.
import "@/models/user"
import "@/models/department"
import "@/models/venue"
import "@/models/event"
import "@/models/audit-log"

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// ponytail: global cache on globalThis avoids re-connecting on every hot reload / route call
const globalForMongoose = globalThis as unknown as { mongoose?: MongooseCache }
const cache: MongooseCache = globalForMongoose.mongoose ?? { conn: null, promise: null }
globalForMongoose.mongoose = cache

export async function connectToDatabase() {
  if (cache.conn) return cache.conn

  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error("Missing MONGODB_URI environment variable")

  cache.promise ??= mongoose.connect(uri)

  cache.conn = await cache.promise
  return cache.conn
}
