import { getBot } from "./bot";

export async function sendTelegramMessage(telegramId: number, text: string) {
  const bot = getBot();
  if (!bot) {
    throw new Error("Telegram bot not initialized");
  }
  await bot.sendMessage(telegramId, text, { parse_mode: "Markdown" });
}
