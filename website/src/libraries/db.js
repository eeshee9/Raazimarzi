import "server-only";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI is not defined in environment variables");
}

/**
 * Mongoose global settings
 */
mongoose.set("strictQuery", true);

/**
 * Global cache for Next.js (prevents multiple connections)
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

export async function connectDB() {
  // If already connected, reuse it
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10, // production safe
        serverSelectionTimeoutMS: 5000,
      })
      .then((mongooseInstance) => {
        if (process.env.NODE_ENV !== "production") {
          console.log("✅ MongoDB connected");
        }
        return mongooseInstance;
      })
      .catch((error) => {
        console.error("❌ MongoDB connection failed:", error);
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
