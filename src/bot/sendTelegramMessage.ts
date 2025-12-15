import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';

const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: false });

export async function sendTelegramMessage(telegramId: number, text: string) {
  await bot.sendMessage(telegramId, text);
}