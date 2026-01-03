import TelegramBot from "node-telegram-bot-api";
import {
  upsertUser,
  getUserByTelegramId,
  getUserSubscriptionCount,
} from "../../db/queries";

export const startCommand = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
) => {
  const chatId = msg.chat.id;

  // Ensure user exists in DB
  await upsertUser(chatId);

  const user = await getUserByTelegramId(chatId);
  const subCount = await getUserSubscriptionCount(chatId);

  const welcomeMessage = `
👋 *Welcome to RepoPulse!*

I help you stay updated on GitHub repositories by sending you notifications about new issues and pull requests.

🔹 *How it works:*
1️⃣ Connect your GitHub account
2️⃣ Subscribe to repositories you care about
3️⃣ Get notified when new issues/PRs are created

🔹 *Free Tier:*
• Track up to 5 repositories
• Real-time notifications
• Label filtering support

🔹 *Commands:*
/connect - Link your GitHub account
/subscribe <repo> - Track a repository
/unsubscribe - Stop tracking a repo
/filter - Set label filters
/status - View your account status
/disconnect - Unlink GitHub account

${
  user?.is_connected
    ? `\n✅ *You're connected as @${user.github_username}*\n`
    : `\n⚠️ *Get started by connecting your GitHub:*\nUse /connect to link your account`
}
`;

  const keyboard = user?.is_connected
    ? undefined
    : {
        inline_keyboard: [
          [{ text: "🔗 Connect GitHub", callback_data: "start_connect" }],
        ],
      };

  return bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
};
