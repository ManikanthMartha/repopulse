import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: process.env.PORT || 8080,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
  DATABASE_URL: process.env.DATABASE_URL!,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN!,
};
