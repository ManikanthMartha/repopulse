import TelegramBot from "node-telegram-bot-api";
import { subscribeCommand } from "./commands/subscribe";
import { startCommand } from "./commands/start";
import { filtersCommand, registerFilterFlow } from "./commands/filters";
import { unsubscribeCommand, registerUnsubscribeFlow } from "./commands/unsubscribe";

export function registerCommands(bot: TelegramBot) {
  bot.onText(/^\/start$/i, (msg) => startCommand(bot, msg));

  // Register /subscribe command
  bot.onText(/^\/subscribe\s+(.+)/i, (msg, match) => { subscribeCommand(bot, msg, match); });
  
  // Register /filter command
  bot.onText(/^\/filter$/i, (msg) => filtersCommand(bot, msg));
  
  // Register multi-step filter flow
  registerFilterFlow(bot);

  // Register /unsubscribe command
  bot.onText(/^\/unsubscribe$/i, (msg) => { unsubscribeCommand(bot, msg); });
  registerUnsubscribeFlow(bot);
}
