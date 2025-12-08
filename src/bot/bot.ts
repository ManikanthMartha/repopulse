import TelegramBot from "node-telegram-bot-api";
import { config } from "../config";
import { registerCommands } from "./handlers";

const BOT_COMMANDS = [
  { command: "start", description: "Register and get started" },
  { command: "subscribe", description: "Subscribe to a GitHub repository" },
  { command: "filter", description: "Set label filters for your subscriptions" },
  { command: "unsubscribe", description: "Unsubscribe from a GitHub repository" },
];

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
  bot.setMyCommands(BOT_COMMANDS);
  console.log("Telegram bot ready");
}

export function getBot() {
  return bot;
}
