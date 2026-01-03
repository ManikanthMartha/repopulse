import {
  saveSubscription,
  upsertRepository,
  upsertUser,
  setInitialRepoState,
  getRepoState,
  getUserIdByTelegramId,
  getRepoIdByFullName,
} from "../db/queries";
import { repoInputToFullName } from "../utils/validation";

export async function subscribeUserToRepo(
  telegramId: number,
  repoInput: string,
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
    console.log(
      `[Subscription] Initial user_repo_state set for user ${userId}, repo ${repoFullName} (ID: ${repoId}) at ${now.toISOString()}`,
    );
  }

  console.log(`User ${telegramId} subscribed to ${repoFullName}`);

  return { repoFullName, subscription };
}

export async function unsubscribeUserFromRepo(
  telegramId: number,
  repoFullName: string,
) {
  const userId = await getUserIdByTelegramId(telegramId);
  const repoId = await getRepoIdByFullName(repoFullName);
  if (!userId || !repoId) return;
  const sql = `DELETE FROM subscriptions WHERE user_id = $1 AND repo_id = $2`;
  await import("../db/index.js").then(({ query }) =>
    query(sql, [userId, repoId]),
  );
}

export function applyFilters(
  item: any,
  filters: { include?: string[]; exclude?: string[] },
): boolean {
  // Get label names, or empty array if no labels
  const labelNames =
    item.labels && Array.isArray(item.labels)
      ? item.labels.map((l: any) => l.name)
      : [];

  // Check exclude filters first - if item has any excluded label, filter it out
  if (filters.exclude && filters.exclude.length > 0) {
    if (labelNames.some((label: string) => filters.exclude!.includes(label))) {
      return false;
    }
  }

  // Check include filters - allow unlabeled issues to pass through
  // because they might get labeled later
  if (filters.include && filters.include.length > 0) {
    // If item has no labels, show it (it might get labeled later)
    if (labelNames.length === 0) {
      return true;
    }
    // If item has labels, check if any match the include filter
    if (!labelNames.some((label: string) => filters.include!.includes(label))) {
      return false;
    }
  }

  return true;
}
