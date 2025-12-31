import {
  saveSubscription,
  upsertRepository,
  upsertUser,
  setInitialRepoState,
  getRepoState,
  getUserIdByTelegramId,
  getRepoIdByFullName
} from "../db/queries";
import { repoInputToFullName } from "../utils/validation";

export async function subscribeUserToRepo(
  telegramId: number,
  repoInput: string
) {
  const repoFullName = repoInputToFullName(repoInput);

  const userId = await upsertUser(telegramId);
  const repoId = await upsertRepository(repoFullName);
  const subscription = await saveSubscription(userId, repoId, {});

  // Set initial per-user-repo state if not present
  const state = await getRepoState(userId, repoId);
  if (!state) {
    const now = new Date();
    await setInitialRepoState(userId, repoId, now, now);
    console.log(`[Subscription] Initial user_repo_state set for user ${userId}, repo ${repoFullName} (ID: ${repoId}) at ${now.toISOString()}`);
  }

  console.log(`User ${telegramId} subscribed to ${repoFullName}`);

  return { repoFullName, subscription };
}

export async function unsubscribeUserFromRepo(telegramId: number, repoFullName: string) {
  const userId = await getUserIdByTelegramId(telegramId);
  const repoId = await getRepoIdByFullName(repoFullName);
  if (!userId || !repoId) return;
  const sql = `DELETE FROM subscriptions WHERE user_id = $1 AND repo_id = $2`;
  await import("../db/index.js").then(({ query }) => query(sql, [userId, repoId]));
}

export function applyFilters(item: any, filters: { include?: string[]; exclude?: string[] }): boolean {
  if (!item.labels || !Array.isArray(item.labels)) return true;
  const labelNames = item.labels.map((l: any) => l.name);
  if (filters.include && filters.include.length > 0) {
    if (!labelNames.some((label: string) => filters.include!.includes(label))) {
      return false;
    }
  }
  if (filters.exclude && filters.exclude.length > 0) {
    if (labelNames.some((label: string) => filters.exclude!.includes(label))) {
      return false;
    }
  }
  return true;
}
