import TelegramBot from "node-telegram-bot-api";
import { getUserRepos, saveSubscription } from "../../db/queries";
import { query } from "../../db/index";

// In-memory session state (for demo; use Redis or DB for production)
const userSession: Record<
  number,
  {
    step: "repo" | "include" | "exclude" | null;
    repo?: string;
    labels?: string[];
    include?: string[];
    exclude?: string[];
  }
> = {};

/**
 * Start filter flow for a specific repo (called after subscription)
 */
export async function startFilterFlow(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  repoFullName: string,
) {
  userSession[telegramId] = {
    step: "include",
    repo: repoFullName,
    include: [],
    exclude: [],
  };

  const labels = await fetchRepoLabels(repoFullName);

  if (!labels?.length) {
    delete userSession[telegramId];
    return bot.sendMessage(
      chatId,
      `No labels found for ${repoFullName}.\n\n` +
        `You'll receive all issues and PRs without filtering.`,
    );
  }

  userSession[telegramId].labels = labels;

  const labelKeyboard = {
    reply_markup: {
      keyboard: labels.map((l) => [{ text: l }]),
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };

  await bot.sendMessage(
    chatId,
    `🎯 *Setting filters for ${repoFullName}*\n\n` +
      `Select labels to *INCLUDE* (send one by one, type 'done' when finished):`,
    { ...labelKeyboard, parse_mode: "Markdown" },
  );
}

export const filtersCommand = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  if (!telegramId) return;

  userSession[telegramId] = { step: "repo" };
  const userRepos: string[] = await getUserRepos(telegramId);
  if (!userRepos.length) {
    return bot.sendMessage(chatId, "You have no subscriptions yet.");
  }
  const keyboard = {
    reply_markup: {
      keyboard: userRepos.map((repo) => [{ text: repo }]),
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
  await bot.sendMessage(chatId, "Select a repository to filter:", keyboard);
};

// Listen for text messages to handle multi-step flow
export function registerFilterFlow(bot: TelegramBot) {
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    if (!telegramId || !userSession[telegramId]) return;
    const session = userSession[telegramId];
    const text = msg.text?.trim();

    if (session.step === "repo" && text) {
      // User selected repo
      session.repo = text;
      session.step = "include";
      session.labels = await fetchRepoLabels(text);
      if (!session.labels?.length) {
        delete userSession[telegramId];
        return bot.sendMessage(chatId, "No labels found for this repo.");
      }
      // Show labels as keyboard
      const labelKeyboard = {
        reply_markup: {
          keyboard: session.labels.map((l) => [{ text: l }]),
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      };
      await bot.sendMessage(
        chatId,
        "Select labels to INCLUDE (send one by one, type 'done' when finished):",
        labelKeyboard,
      );
      session.include = [];
      return;
    }

    if (session.step === "include" && text) {
      if (text.toLowerCase() === "done") {
        session.step = "exclude";
        session.exclude = [];
        const labelKeyboard = {
          reply_markup: {
            keyboard: session.labels!.map((l) => [{ text: l }]),
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        };
        await bot.sendMessage(
          chatId,
          "Select labels to EXCLUDE (send one by one, type 'done' when finished):",
          labelKeyboard,
        );
        return;
      }
      if (session.labels?.includes(text) && !session.include?.includes(text)) {
        session.include?.push(text);
        await bot.sendMessage(chatId, `Included: ${text}`);
      }
      return;
    }

    if (session.step === "exclude" && text) {
      if (text.toLowerCase() === "done") {
        // Save to DB
        const userId = telegramId;
        const filters = {
          include: session.include || [],
          exclude: session.exclude || [],
        };
        // Save or update subscription
        await updateSubscriptionFilters(userId, session.repo!, filters);
        await bot.sendMessage(
          chatId,
          `Filters updated for ${session.repo}!
Include: ${filters.include.join(", ")}
Exclude: ${filters.exclude.join(", ")}`,
        );
        delete userSession[telegramId];
        return;
      }
      if (session.labels?.includes(text) && !session.exclude?.includes(text)) {
        session.exclude?.push(text);
        await bot.sendMessage(chatId, `Excluded: ${text}`);
      }
      return;
    }
  });
}

export async function fetchRepoLabels(repoFullName: string): Promise<string[]> {
  const fetch = (await import("node-fetch")).default;
  const allLabels: string[] = [];
  let page = 1;
  const perPage = 100; // Max allowed by GitHub API

  while (true) {
    const url = `https://api.github.com/repos/${repoFullName}/labels?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "repopulse-bot" },
    });

    if (!res.ok) {
      console.error(
        `Failed to fetch labels for ${repoFullName}: ${res.status}`,
      );
      break;
    }

    const labels = (await res.json()) as Array<{ name: string }>;

    if (labels.length === 0) {
      // No more labels to fetch
      break;
    }

    allLabels.push(...labels.map((l) => l.name));

    // If we got fewer than perPage results, we've reached the last page
    if (labels.length < perPage) {
      break;
    }

    page++;
  }

  return allLabels;
}

export async function updateSubscriptionFilters(
  telegramId: number,
  repoFullName: string,
  filters: { include: string[]; exclude: string[] },
) {
  // Get userId and repoId
  const sqlUser = `SELECT id FROM users WHERE telegram_id = $1`;
  const userRes = await query<{ id: number }>(sqlUser, [telegramId]);
  const userId = userRes.rows[0]?.id;
  if (!userId) return;
  const sqlRepo = `SELECT id FROM repositories WHERE full_name = $1`;
  const repoRes = await query<{ id: number }>(sqlRepo, [repoFullName]);
  const repoId = repoRes.rows[0]?.id;
  if (!repoId) return;
  await saveSubscription(userId, repoId, filters);
}
