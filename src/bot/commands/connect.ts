import TelegramBot from "node-telegram-bot-api";
import { config } from "../../config";
import { generateOAuthState } from "../../utils/crypto";
import { saveOAuthState, getUserByTelegramId, upsertUser } from "../../db/queries";

export const connectCommand = async (bot: TelegramBot, msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;

  // Ensure user exists in DB
  await upsertUser(chatId);

  // Check if already connected
  const user = await getUserByTelegramId(chatId);
  
  if (user?.is_connected) {
    return bot.sendMessage(
      chatId,
      `✅ You're already connected to GitHub!\n\n` +
      `👤 Connected as: @${user.github_username}\n` +
      `📊 Repo limit: ${user.repo_limit}\n\n` +
      `Use /disconnect to unlink your GitHub account.`
    );
  }

  // Generate OAuth state for CSRF protection
  const state = generateOAuthState();
  await saveOAuthState(state, chatId);

  // Build GitHub OAuth URL
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', config.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', config.GITHUB_OAUTH_CALLBACK_URL);
  githubAuthUrl.searchParams.set('scope', 'repo read:user');
  githubAuthUrl.searchParams.set('state', state);

  const keyboard = {
    inline_keyboard: [
      [{ text: '🔗 Connect GitHub', url: githubAuthUrl.toString() }]
    ]
  };

  return bot.sendMessage(
    chatId,
    `🔐 *Connect your GitHub Account*\n\n` +
    `To use RepoPulse, you need to connect your GitHub account.\n\n` +
    `*Why connect?*\n` +
    `• Uses your own GitHub API quota\n` +
    `• Access to private repos you have access to\n` +
    `• More reliable notifications\n\n` +
    `*Security:*\n` +
    `• Your token is encrypted and stored securely\n` +
    `• We only request necessary permissions\n` +
    `• You can disconnect anytime with /disconnect\n\n` +
    `Click the button below to connect:`,
    { 
      parse_mode: 'Markdown',
      reply_markup: keyboard 
    }
  );
};

export const disconnectCommand = async (bot: TelegramBot, msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  const user = await getUserByTelegramId(chatId);

  if (!user?.is_connected) {
    return bot.sendMessage(
      chatId,
      `You're not connected to GitHub.\n\nUse /connect to link your account.`
    );
  }

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Yes, disconnect', callback_data: 'disconnect_confirm' },
        { text: '❌ Cancel', callback_data: 'disconnect_cancel' }
      ]
    ]
  };

  return bot.sendMessage(
    chatId,
    `⚠️ *Disconnect GitHub?*\n\n` +
    `This will:\n` +
    `• Remove your GitHub connection\n` +
    `• Keep your subscriptions (but they won't update)\n\n` +
    `Are you sure?`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    }
  );
};

export const statusCommand = async (bot: TelegramBot, msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  const user = await getUserByTelegramId(chatId);

  if (!user) {
    return bot.sendMessage(
      chatId,
      `You haven't started using RepoPulse yet.\n\nUse /start to get started!`
    );
  }

  const { getUserSubscriptionCount } = await import("../../db/queries.js");
  const subCount = await getUserSubscriptionCount(chatId);
  const remaining = user.repo_limit - subCount;

  if (user.is_connected) {
    return bot.sendMessage(
      chatId,
      `📊 *Your RepoPulse Status*\n\n` +
      `✅ GitHub: Connected as @${user.github_username}\n` +
      `📁 Repos tracked: ${subCount}/${user.repo_limit}\n` +
      `📈 Remaining slots: ${remaining}\n\n` +
      `Commands:\n` +
      `/subscribe <repo> - Track a new repo\n` +
      `/unsubscribe - Stop tracking a repo\n` +
      `/disconnect - Unlink GitHub`,
      { parse_mode: 'Markdown' }
    );
  } else {
    return bot.sendMessage(
      chatId,
      `📊 *Your RepoPulse Status*\n\n` +
      `❌ GitHub: Not connected\n` +
      `📁 Repos tracked: ${subCount}/${user.repo_limit}\n\n` +
      `⚠️ Connect your GitHub account to start tracking!\n\n` +
      `Use /connect to link your GitHub account.`,
      { parse_mode: 'Markdown' }
    );
  }
};
