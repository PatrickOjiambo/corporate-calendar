import mongoose from "mongoose"

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
