import TelegramBot from "node-telegram-bot-api";
import { subscribeUserToRepo } from "../../services/subscriptionService";
import { fetchGithubForUser } from "../../utils/fetchGithub";
import {
  getUserByTelegramId,
  getUserSubscriptionCount,
  getUserRepoLimit,
  upsertUser,
} from "../../db/queries";
import { log } from "console";

export const subscribeCommand = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray | null,
) => {
  const chatId = msg.chat.id;
  const repoInput = match?.[1]?.trim();

  // Ensure user exists
  await upsertUser(chatId);

  // Check if user is connected to GitHub
  const user = await getUserByTelegramId(chatId);

  // Only enforce repo limit for users who haven't connected GitHub
  if (!user?.is_connected) {
    const currentCount = await getUserSubscriptionCount(chatId);
    const limit = await getUserRepoLimit(chatId);

    if (currentCount >= limit) {
      return bot.sendMessage(
        chatId,
        `⚠️ *Repo Limit Reached*\n\n` +
          `You've reached your limit of ${limit} repositories.\n\n` +
          `💡 *Want unlimited repos?*\n` +
          `Connect your GitHub account with /connect to remove this limit!\n\n` +
          `Or use /unsubscribe to remove a repo first.`,
        { parse_mode: "Markdown" },
      );
    }
  }

  if (!repoInput) {
    return bot.sendMessage(
      chatId,
      "Send a repo URL or owner/repo, e.g. /subscribe https://github.com/vercel/next.js",
    );
  }

  // Extract owner/repo from input
  let repoFullName = repoInput
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");

  // Validate format
  if (!/^([\w-]+)\/[\w.-]+$/.test(repoFullName)) {
    return bot.sendMessage(
      chatId,
      "Invalid repo format. Use owner/repo or a valid GitHub URL.",
    );
  }

  // Check if repo exists on GitHub (uses user's token if connected, fallback otherwise)
  const githubApiUrl = `https://api.github.com/repos/${repoFullName}`;
  try {
    await fetchGithubForUser(githubApiUrl, chatId);
    log(`[Bot] Repo ${repoFullName} exists on GitHub`);
  } catch (err) {
    return bot.sendMessage(
      chatId,
      `Repository '${repoFullName}' not found on GitHub or you don't have access.`,
    );
  }

  try {
    const { repoFullName: savedRepo } = await subscribeUserToRepo(
      chatId,
      repoFullName,
    );

    // Get updated count and user info
    const currentCount = await getUserSubscriptionCount(chatId);
    const userInfo = await getUserByTelegramId(chatId);

    let message = `✅ Subscribed to *${savedRepo}* 🎉\n\n`;

    if (userInfo?.is_connected) {
      // Connected users: show unlimited status
      message +=
        `📊 Total repos tracked: ${currentCount}\n` +
        `✨ Unlimited tracking enabled\n` +
        `👤 Connected as: @${userInfo.github_username}`;
    } else {
      // Unconnected users: show limit
      const limit = await getUserRepoLimit(chatId);
      const remaining = limit - currentCount;
      message +=
        `📊 Repos tracked: ${currentCount}/${limit}\n` +
        `📈 Remaining slots: ${remaining}\n\n` +
        `💡 *Tip:* Connect your GitHub with /connect for:\n` +
        `• Unlimited repo tracking\n` +
        `• Better rate limits\n` +
        `• Private repo access`;
    }

    // Add inline keyboard to set filters immediately
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "🎯 Set Filters Now",
            callback_data: `set_filter:${savedRepo}`,
          },
        ],
      ],
    };

    message += `\n\n🔔 *Configure Notifications*\nClick below to set up label filters:`;

    return bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (err) {
    console.log("Failed to subscribe", err);
    return bot.sendMessage(
      chatId,
      "Failed to subscribe. Double-check the repo URL and try again.",
    );
  }
};
