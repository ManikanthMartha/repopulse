import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: process.env.PORT || 8080,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
  DATABASE_URL: process.env.DATABASE_URL!,
  GITHUB_APP_ID: process.env.GITHUB_APP_ID!,
  GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY!,
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET!,
};
