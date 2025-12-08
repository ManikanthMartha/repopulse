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

  try {
    const { repoFullName } = await subscribeUserToRepo(chatId, repoInput);
    return bot.sendMessage(chatId, `Subscribed to ${repoFullName} 🎉`);
  } catch (err) {
    console.log("Failed to subscribe", err);
    return bot.sendMessage(
      chatId,
      "Failed to subscribe. Double-check the repo URL and try again."
    );
  }
};

