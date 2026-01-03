import TelegramBot from "node-telegram-bot-api";
import { SubscriptionFilters } from "../db/queries";

export interface CommandContext {
  bot: TelegramBot;
  chatId: number;
  text?: string;
}

export interface FilterConfig extends SubscriptionFilters {
  repoFullName: string;
}
