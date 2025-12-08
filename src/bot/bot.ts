import TelegramBot from "node-telegram-bot-api";
import { config } from "../config";
import { registerCommands } from "./handlers";

let bot: TelegramBot;

export function initBot() {
  if (!config.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN missing");
  }

  bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });
  bot.on("message", (msg) => {
    console.log(`Received message from ${msg.chat.id}: ${msg.text}`);
  });
  registerCommands(bot);
  console.log("Telegram bot ready");
}

export function getBot() {
  return bot;
}
