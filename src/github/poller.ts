import { query } from "../db/index";
import {
  getUserRepos,
  getRepoState,
  updateRepoState,
  getSubscriptionByRepo,
  upsertRepository,
  getUserIdByTelegramId,
} from "../db/queries";
import { sendTelegramMessage } from "../bot/sendTelegramMessage";
import { applyFilters } from "../services/subscriptionService";
import cron from "node-cron";
import { fetchGithubForUser } from "../utils/fetchGithub";
import { log, error as logError } from "../utils/logger";

async function fetchIssues(
  repoFullName: string,
  telegramId: number,
  since?: string,
): Promise<any[]> {
  log(`[Poller] Fetching issues for ${repoFullName} since ${since}`);
  const url = `https://api.github.com/repos/${repoFullName}/issues?state=all${since ? `&since=${since}` : ""}`;
  const data = await fetchGithubForUser(url, telegramId);
  log(
    `[Poller] Issues fetched for ${repoFullName}:`,
    Array.isArray(data) ? data.length : data,
  );
  return data as any[];
}

async function fetchPRs(
  repoFullName: string,
  telegramId: number,
  since?: string,
): Promise<any[]> {
  log(`[Poller] Fetching PRs for ${repoFullName} since ${since}`);
  // GitHub PRs API doesn't support 'since' parameter, so we fetch recent PRs and filter by created_at
  const url = `https://api.github.com/repos/${repoFullName}/pulls?state=all&sort=created&direction=desc&per_page=100`;
  const data = await fetchGithubForUser(url, telegramId);

  if (!Array.isArray(data)) {
    log(`[Poller] Invalid PR data for ${repoFullName}`);
    return [];
  }

  // Filter PRs created after the 'since' timestamp
  if (since) {
    const sinceDate = new Date(since);
    const filteredPRs = data.filter(
      (pr: any) => new Date(pr.created_at) > sinceDate,
    );
    log(
      `[Poller] PRs fetched for ${repoFullName}: ${data.length} total, ${filteredPRs.length} new since ${since}`,
    );
    return filteredPRs;
  }

  log(`[Poller] PRs fetched for ${repoFullName}:`, data.length);
  return data as any[];
}

export async function pollRepos() {
  log("[Poller] Starting pollRepos");
  // Get all users with subscriptions
  const usersRes = await query("SELECT telegram_id FROM users");
  const users = usersRes.rows as { telegram_id: number }[];
  log(`[Poller] Found ${users.length} users`);

  for (const user of users) {
    const telegramId = user.telegram_id;

    log(`[Poller] Processing user ${telegramId}`);

    // Get userId for this telegram user
    const userId = await getUserIdByTelegramId(telegramId);
    if (!userId) {
      log(`[Poller] No userId found for telegram ${telegramId}`);
      continue;
    }

    const repoNames = await getUserRepos(telegramId);
    log(`[Poller] User ${telegramId} subscribed to repos:`, repoNames);

    for (const repoFullName of repoNames) {
      try {
        // Ensure repo exists in DB and get its ID
        const repoId = await upsertRepository(repoFullName);

        // Get per-user-repo state
        const state = await getRepoState(userId, repoId);
        const lastIssueCheck = state?.last_issue_check?.toISOString();
        const lastPRCheck = state?.last_pr_check?.toISOString();
        log(
          `[Poller] User ${userId}, Repo ${repoFullName} (ID: ${repoId}) lastIssueCheck: ${lastIssueCheck}, lastPRCheck: ${lastPRCheck}`,
        );

        // Fetch new/updated issues using user's token
        const issues = await fetchIssues(
          repoFullName,
          telegramId,
          lastIssueCheck,
        );
        // Fetch new/updated PRs using user's token
        const prs = await fetchPRs(repoFullName, telegramId, lastPRCheck);

        // Get user's subscription filters for this repo
        log(
          `[Poller] Fetching subscription for user ${telegramId} and repo ${repoFullName}`,
        );
        const subscription = await getSubscriptionByRepo(
          telegramId,
          repoFullName,
        );
        if (!subscription) {
          log(
            `[Poller] No subscription found for user ${telegramId} and repo ${repoFullName}`,
          );
          continue;
        }
        const filters = subscription.filters;
        log(
          `[Poller] Filters for user ${telegramId} on repo ${repoFullName}:`,
          filters,
        );

        // Notify user for matching issues/PRs
        for (const item of [...(issues || []), ...(prs || [])]) {
          if (applyFilters(item, filters)) {
            log(`[Poller] Notifying user ${telegramId} about ${item.html_url}`);
            await sendTelegramMessage(
              telegramId,
              formatGithubEvent(item, repoFullName),
            );
          } else {
            log(
              `[Poller] Item ${item.html_url} did not match filters for user ${telegramId}`,
            );
          }
        }

        // Update per-user-repo state
        await updateRepoState(userId, repoId, new Date(), new Date());
        log(
          `[Poller] Updated user_repo_state for user ${userId}, repo ${repoFullName}`,
        );
      } catch (err) {
        logError(
          `[Poller] Error processing repo ${repoFullName} for user ${telegramId}:`,
          err,
        );
      }
    }
  }
  log("[Poller] pollRepos finished");
}

function formatGithubEvent(item: any, repoFullName: string): string {
  const isPR = !!item.pull_request;
  const emoji = isPR ? "🔀" : "🐛";
  const type = isPR ? "Pull Request" : "Issue";

  // Format labels
  let labelText = "";
  if (item.labels && item.labels.length > 0) {
    const labelNames = item.labels.map((l: any) => `\`${l.name}\``).join(" ");
    labelText = `\n🏷️ ${labelNames}`;
  }

  // Format state with emoji
  let stateEmoji = "";
  if (item.state === "open") {
    stateEmoji = "🟢";
  } else if (item.state === "closed") {
    stateEmoji = isPR && item.merged ? "🟣" : "🔴";
  }

  // Author info
  const author = item.user?.login || "Unknown";

  // Format date
  const createdAt = new Date(item.created_at);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
  let timeText = "";
  if (diffMinutes < 1) {
    timeText = "just now";
  } else if (diffMinutes < 60) {
    timeText = `${diffMinutes}m ago`;
  } else if (diffMinutes < 1440) {
    timeText = `${Math.floor(diffMinutes / 60)}h ago`;
  } else {
    timeText = `${Math.floor(diffMinutes / 1440)}d ago`;
  }

  return (
    `${emoji} *${type} #${item.number}* ${stateEmoji}\n` +
    `📦 ${repoFullName}\n` +
    `\n` +
    `*${item.title}*\n` +
    `${labelText}\n` +
    `\n` +
    `👤 ${author} • ⏰ ${timeText}\n` +
    `🔗 ${item.html_url}`
  );
}

// Schedule polling every 20 seconds (for development)
cron.schedule("*/20 * * * * *", async () => {
  log("[Poller] Running scheduled GitHub poll...");
  try {
    await pollRepos();
    log("[Poller] Polling complete.");
  } catch (err) {
    logError("[Poller] Polling error:", err);
  }
});
