import { createClient } from "redis";

// Setup Redis client (dummy config, update with your connection string)
const redis = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
redis.connect();

export interface FilterSession {
  step: "repo" | "include" | "exclude" | null;
  repo?: string;
  labels?: string[];
  include?: string[];
  exclude?: string[];
}

const SESSION_PREFIX = "filter_session:";

export async function saveFilterSession(telegramId: number, session: FilterSession) {
  await redis.set(
    SESSION_PREFIX + telegramId,
    JSON.stringify(session),
    { EX: 3600 } // expire in 1 hour
  );
}

export async function getFilterSession(telegramId: number): Promise<FilterSession | null> {
  const data = await redis.get(SESSION_PREFIX + telegramId);
  return data ? JSON.parse(data) : null;
}

export async function deleteFilterSession(telegramId: number) {
  await redis.del(SESSION_PREFIX + telegramId);
}

// Usage example:
// await saveFilterSession(123456, { step: "repo", repo: "vercel/next.js" });
// const session = await getFilterSession(123456);
// await deleteFilterSession(123456);
