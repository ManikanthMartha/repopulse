import TelegramBot from "node-telegram-bot-api";
import { subscribeCommand } from "./commands/subscribe";
import { startCommand } from "./commands/start";

export function registerCommands(bot: TelegramBot) {
  bot.onText(/^\/start$/i, (msg) => startCommand(bot, msg));
  bot.onText(/^\/subscribe(?:\s+(.+))?$/i, (msg, match) =>
    subscribeCommand(bot, msg, match)
  );
}
