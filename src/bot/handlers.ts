import TelegramBot from "node-telegram-bot-api";
import { subscribeCommand } from "./commands/subscribe";
import { startCommand } from "./commands/start";
import { filtersCommand, registerFilterFlow } from "./commands/filters";
import {
  unsubscribeCommand,
  registerUnsubscribeFlow,
} from "./commands/unsubscribe";
import {
  connectCommand,
  disconnectCommand,
  statusCommand,
} from "./commands/connect";
import { disconnectGitHub, getUserByTelegramId } from "../db/queries";

export function registerCommands(bot: TelegramBot) {
  bot.onText(/^\/start$/i, (msg) => startCommand(bot, msg));

  // Register /subscribe command
  bot.onText(/^\/subscribe\s+(.+)/i, (msg, match) => {
    subscribeCommand(bot, msg, match);
  });

  // Register /filter command
  bot.onText(/^\/filter$/i, (msg) => filtersCommand(bot, msg));
  // Register multi-step filter flow
  registerFilterFlow(bot);

  // Register /unsubscribe command
  bot.onText(/^\/unsubscribe$/i, (msg) => {
    unsubscribeCommand(bot, msg);
  });
  registerUnsubscribeFlow(bot);

  // GitHub OAuth commands
  bot.onText(/^\/connect$/i, (msg) => connectCommand(bot, msg));
  bot.onText(/^\/disconnect$/i, (msg) => disconnectCommand(bot, msg));
  bot.onText(/^\/status$/i, (msg) => statusCommand(bot, msg));

  // Handle callback queries (inline button clicks)
  registerCallbackQueries(bot);
}

function registerCallbackQueries(bot: TelegramBot) {
  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data;
    const telegramId = query.from.id;

    if (!chatId || !data) return;

    try {
      // Handle filter setup after subscription
      if (data.startsWith("set_filter:")) {
        const repoName = data.replace("set_filter:", "");
        await bot.answerCallbackQuery(query.id);
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          {
            chat_id: chatId,
            message_id: query.message?.message_id,
          },
        );

        // Import and trigger filter flow
        const { startFilterFlow } = await import("./commands/filters.js");
        await startFilterFlow(bot, chatId, telegramId, repoName);
        return;
      }

      switch (data) {
        case "start_connect":
          await bot.answerCallbackQuery(query.id);
          await connectCommand(bot, query.message as TelegramBot.Message);
          break;

        case "disconnect_confirm":
          await disconnectGitHub(chatId);
          await bot.answerCallbackQuery(query.id, {
            text: "GitHub disconnected",
          });
          await bot.editMessageText(
            `✅ GitHub account disconnected.\n\n` +
              `Your subscriptions are still saved, but won't receive updates until you reconnect.\n\n` +
              `Use /connect to link your account again.`,
            { chat_id: chatId, message_id: query.message?.message_id },
          );
          break;

        case "disconnect_cancel":
          await bot.answerCallbackQuery(query.id, { text: "Cancelled" });
          await bot.editMessageText(
            `✅ Disconnect cancelled. Your GitHub account is still connected.`,
            { chat_id: chatId, message_id: query.message?.message_id },
          );
          break;

        default:
          // Let other handlers deal with it
          break;
      }
    } catch (err) {
      console.error("Callback query error:", err);
      await bot.answerCallbackQuery(query.id, { text: "An error occurred" });
    }
  });
}
