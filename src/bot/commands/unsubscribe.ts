import TelegramBot from "node-telegram-bot-api";
import { getUserRepos } from "../../db/queries";
import { unsubscribeUserFromRepo } from "../../services/subscriptionService";

// In-memory session for unsubscribe flow
const unsubscribeSession: Record<
  number,
  { step: "repo" | null; repos: string[]; selected: string[] }
> = {};

export const unsubscribeCommand = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  if (!telegramId) return;

  const userRepos: string[] = await getUserRepos(telegramId);
  if (!userRepos.length) {
    return bot.sendMessage(chatId, "You have no subscriptions to unsubscribe.");
  }

  unsubscribeSession[telegramId] = {
    step: "repo",
    repos: userRepos,
    selected: [],
  };
  const keyboard = {
    reply_markup: {
      keyboard: userRepos.map((repo) => [{ text: repo }]),
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
  await bot.sendMessage(
    chatId,
    "Select repos to unsubscribe (send one by one, type 'done' when finished):",
    keyboard,
  );
};

export function registerUnsubscribeFlow(bot: TelegramBot) {
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    if (!telegramId || !unsubscribeSession[telegramId]) return;
    const session = unsubscribeSession[telegramId];
    const text = msg.text?.trim();

    if (session.step === "repo" && text) {
      if (text.toLowerCase() === "done") {
        // Unsubscribe from selected repos
        if (!session.selected.length) {
          await bot.sendMessage(chatId, "No repos selected to unsubscribe.");
          delete unsubscribeSession[telegramId];
          return;
        }
        for (const repo of session.selected) {
          await unsubscribeUserFromRepo(telegramId, repo);
        }
        await bot.sendMessage(
          chatId,
          `Unsubscribed from: ${session.selected.join(", ")}`,
        );
        delete unsubscribeSession[telegramId];
        return;
      }
      if (session.repos.includes(text) && !session.selected.includes(text)) {
        session.selected.push(text);
        await bot.sendMessage(chatId, `Marked for unsubscribe: ${text}`);
      }
      return;
    }
  });
}
