import TelegramBot from "node-telegram-bot-api";
import { subscribeUserToRepo } from "../../services/subscriptionService";
export const subscribeCommand = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray | null
) => {
  const chatId = msg.chat.id;
  const repoInput = match?.[1]?.trim();

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

  // Check if repo exists on GitHub
  // Check if repo exists on GitHub
  const githubApiUrl = `https://api.github.com/repos/${repoFullName}`;
  try {
    const fetch = (await import("node-fetch")).default;
    const res = await fetch(githubApiUrl, { headers: { "User-Agent": "repopulse-bot" } });
    if (res.status !== 200) {
      return bot.sendMessage(chatId, `Repository '${repoFullName}' not found on GitHub.`);
    }
  } catch (err) {
    return bot.sendMessage(chatId, "Could not verify repository on GitHub. Try again later.");
  }
  try {
    const { repoFullName: savedRepo } = await subscribeUserToRepo(chatId, repoFullName);
    return bot.sendMessage(chatId, `Subscribed to ${savedRepo} 🎉`);
  } catch (err) {
    console.log("Failed to subscribe", err);
    return bot.sendMessage(
      chatId,
      "Failed to subscribe. Double-check the repo URL and try again."
    );
  }
};

