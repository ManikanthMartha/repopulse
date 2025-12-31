import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: process.env.PORT || 8080,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
  DATABASE_URL: process.env.DATABASE_URL!,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN!, // Fallback token for unauthenticated users
  
  // GitHub OAuth
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID!,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET!,
  GITHUB_OAUTH_CALLBACK_URL: process.env.GITHUB_OAUTH_CALLBACK_URL || 'http://localhost:8080/auth/github/callback',
  
  // Encryption key for storing tokens securely
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'repopulse-default-key-change-in-prod',
  
  // App settings
  BASE_URL: process.env.BASE_URL || 'http://localhost:8080',
  DEFAULT_REPO_LIMIT: 5,
};