import TelegramBot from "node-telegram-bot-api";
import { subscribeUserToRepo } from "../../services/subscriptionService";
import { fetchGithubForUser } from '../../utils/fetchGithub';
import { getUserByTelegramId, getUserSubscriptionCount, getUserRepoLimit, upsertUser } from "../../db/queries";
import { log } from "console";

export const subscribeCommand = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray | null
) => {
  const chatId = msg.chat.id;
  const repoInput = match?.[1]?.trim();

  // Ensure user exists
  await upsertUser(chatId);

  // Check repo limit
  const currentCount = await getUserSubscriptionCount(chatId);
  const limit = await getUserRepoLimit(chatId);
  
  if (currentCount >= limit) {
    return bot.sendMessage(
      chatId,
      `⚠️ *Repo Limit Reached*\n\n` +
      `You've reached your limit of ${limit} repositories.\n\n` +
      `Use /unsubscribe to remove a repo before adding new ones.\n` +
      `Use /status to see your current subscriptions.`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!repoInput) {
    return bot.sendMessage(
      chatId,
      "Send a repo URL or owner/repo, e.g. /subscribe https://github.com/vercel/next.js"
    );
  }

  // Extract owner/repo from input
  let repoFullName = repoInput
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");

  // Validate format
  if (!/^([\w-]+)\/[\w.-]+$/.test(repoFullName)) {
    return bot.sendMessage(chatId, "Invalid repo format. Use owner/repo or a valid GitHub URL.");
  }

  // Check if repo exists on GitHub (uses user's token if connected, fallback otherwise)
  const githubApiUrl = `https://api.github.com/repos/${repoFullName}`;
  try {
    await fetchGithubForUser(githubApiUrl, chatId);
    log(`[Bot] Repo ${repoFullName} exists on GitHub`);
  } catch (err) {
    return bot.sendMessage(chatId, `Repository '${repoFullName}' not found on GitHub or you don't have access.`);
  }

  try {
    const { repoFullName: savedRepo } = await subscribeUserToRepo(chatId, repoFullName);
    const newCount = currentCount + 1;
    const remaining = limit - newCount;
    
    // Check if user is connected to show appropriate message
    const user = await getUserByTelegramId(chatId);
    
    let message = `✅ Subscribed to *${savedRepo}* 🎉\n\n` +
      `📊 Repos tracked: ${newCount}/${limit}\n` +
      `📈 Remaining slots: ${remaining}`;
    
    // If user hasn't connected GitHub, add a hint
    if (!user?.is_connected) {
      message += `\n\n💡 *Tip:* Connect your GitHub account with /connect for better rate limits and private repo access.`;
    }
    
    return bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    console.log("Failed to subscribe", err);
    return bot.sendMessage(
      chatId,
      "Failed to subscribe. Double-check the repo URL and try again."
    );
  }
};

