import TelegramBot from "node-telegram-bot-api";
import { query } from "../../db/index";

// In-memory session for unsubscribe flow
const unsubscribeSession: Record<number, { step: "repo" | null, repos: string[], selected: string[] }> = {};

// Get all repo names for a user
async function getUserRepos(telegramId: number): Promise<string[]> {
  const sql = `SELECT r.full_name FROM subscriptions s INNER JOIN repositories r ON s.repo_id = r.id INNER JOIN users u ON s.user_id = u.id WHERE u.telegram_id = $1`;
  const result = await query<{ full_name: string }>(sql, [telegramId]);
  return result.rows.map((r) => r.full_name);
}

export const unsubscribeCommand = async (
  bot: TelegramBot,
  msg: TelegramBot.Message
) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  if (!telegramId) return;

  const userRepos: string[] = await getUserRepos(telegramId);
  if (!userRepos.length) {
    return bot.sendMessage(chatId, "You have no subscriptions to unsubscribe.");
  }

  unsubscribeSession[telegramId] = { step: "repo", repos: userRepos, selected: [] };
  const keyboard = {
    reply_markup: {
      keyboard: userRepos.map((repo) => [{ text: repo }]),
      resize_keyboard: true,
      one_time_keyboard: false
    }
  };
  await bot.sendMessage(chatId, "Select repos to unsubscribe (send one by one, type 'done' when finished):", keyboard);
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
        await bot.sendMessage(chatId, `Unsubscribed from: ${session.selected.join(", ")}`);
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

async function unsubscribeUserFromRepo(telegramId: number, repoFullName: string) {
  // Remove subscription for user/repo
  const sql = `DELETE FROM subscriptions WHERE user_id = (SELECT id FROM users WHERE telegram_id = $1) AND repo_id = (SELECT id FROM repositories WHERE full_name = $2)`;
  await query(sql, [telegramId, repoFullName]);
}