import { query } from '../db/index';
import { getUserRepos, getRepoState, updateRepoState, getSubscriptionByRepo, upsertRepository } from '../db/queries';
import { sendTelegramMessage } from '../bot/sendTelegramMessage';
import { applyFilters } from '../services/subscriptionService';
import cron from 'node-cron';
import { fetchGithub } from '../utils/fetchGithub';
import { log, error as logError } from '../utils/logger';

async function fetchIssues(repoFullName: string, since?: string): Promise<any[]> {
  log(`[Poller] Fetching issues for ${repoFullName} since ${since}`);
  const url = `https://api.github.com/repos/${repoFullName}/issues?state=all${since ? `&since=${since}` : ''}`;
  const data = await fetchGithub(url);
  log(`[Poller] Issues fetched for ${repoFullName}:`, Array.isArray(data) ? data.length : data);
  return data as any[];
}

async function fetchPRs(repoFullName: string, since?: string): Promise<any[]> {
  log(`[Poller] Fetching PRs for ${repoFullName} since ${since}`);
  const url = `https://api.github.com/repos/${repoFullName}/pulls?state=all&sort=updated&direction=desc`;
  const data = await fetchGithub(url);
  log(`[Poller] PRs fetched for ${repoFullName}:`, Array.isArray(data) ? data.length : data);
  return data as any[];
}

export async function pollRepos() {
  log('[Poller] Starting pollRepos');
  // Get all users
  const usersRes = await query('SELECT telegram_id FROM users');
  const users = usersRes.rows as { telegram_id: number }[];
  log(`[Poller] Found ${users.length} users`);

  for (const user of users) {
    const telegramId = user.telegram_id;
    log(`[Poller] Processing user ${telegramId}`);
    const repoNames = await getUserRepos(telegramId);
    log(`[Poller] User ${telegramId} subscribed to repos:`, repoNames);
    for (const repoFullName of repoNames) {
      // Ensure repo exists in DB and get its ID
      const repoId = await upsertRepository(repoFullName);
      const state = await getRepoState(repoId);
      const lastIssueCheck = state?.last_issue_check?.toISOString();
      const lastPRCheck = state?.last_pr_check?.toISOString();
      log(`[Poller] Repo ${repoFullName} (ID: ${repoId}) lastIssueCheck: ${lastIssueCheck}, lastPRCheck: ${lastPRCheck}`);

      // Fetch new/updated issues
      const issues = await fetchIssues(repoFullName, lastIssueCheck);
      // Fetch new/updated PRs
      const prs = await fetchPRs(repoFullName, lastPRCheck);

      // Get user's subscription filters for this repo
      log(`[Poller] Fetching subscription for user ${telegramId} and repo ${repoFullName}`);
      const subscription = await getSubscriptionByRepo(telegramId, repoFullName);
      if (!subscription) {
        log(`[Poller] No subscription found for user ${telegramId} and repo ${repoFullName}`);
        continue;
      }
      const filters = subscription.filters;
      log(`[Poller] Filters for user ${telegramId} on repo ${repoFullName}:`, filters);

      // Notify user for matching issues/PRs
      for (const item of [...(issues || []), ...(prs || [])]) {
        if (applyFilters(item, filters)) {
          log(`[Poller] Notifying user ${telegramId} about ${item.html_url}`);
          await sendTelegramMessage(telegramId, formatGithubEvent(item));
        } else {
          log(`[Poller] Item ${item.html_url} did not match filters for user ${telegramId}`);
        }
      }

      // Update last checked timestamps
      await updateRepoState(repoId, new Date(), new Date());
      log(`[Poller] Updated repo state for ${repoFullName}`);
    }
  }
  log('[Poller] pollRepos finished');
}

function formatGithubEvent(item: any): string {
  // Format the issue/PR for Telegram message
  return `[#${item.number}] ${item.title}\n${item.html_url}`;
}

// Schedule polling every 10 seconds (for development)
cron.schedule('*/10 * * * * *', async () => {
  log('[Poller] Running scheduled GitHub poll...');
  try {
    await pollRepos();
    log('[Poller] Polling complete.');
  } catch (err) {
    logError('[Poller] Polling error:', err);
  }
});

