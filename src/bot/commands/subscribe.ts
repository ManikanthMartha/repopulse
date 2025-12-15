import TelegramBot from "node-telegram-bot-api";
import { subscribeUserToRepo } from "../../services/subscriptionService";
import { fetchGithub } from '../../utils/fetchGithub';
import { log } from "console";

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
  const githubApiUrl = `https://api.github.com/repos/${repoFullName}`;
  try {
    await fetchGithub(githubApiUrl);
    log(`[Bot] Repo ${repoFullName} exists on GitHub`);
  } catch (err) {
    return bot.sendMessage(chatId, `Repository '${repoFullName}' not found on GitHub.`);
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

