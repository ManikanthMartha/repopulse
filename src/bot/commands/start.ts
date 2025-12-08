import TelegramBot from "node-telegram-bot-api";

export const startCommand = async (bot: TelegramBot, msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;

  return bot.sendMessage(
    chatId,
    `Hey 👋 I'm RepoPulse.
I notify you your interested issues & PRs.

Use:
  /subscribe <github_repo_url>
Example:
  /subscribe https://github.com/vercel/next.js`
  );
};
