import { config } from "../config";
import { getUserByTelegramId } from "../db/queries";
import { decryptToken } from "./crypto";

/**
 * Fetch from GitHub API using the global token (for system operations)
 */
export async function fetchGithub(
  url: string,
  options: Record<string, any> = {},
) {
  const headers = {
    Authorization: `token ${config.GITHUB_TOKEN}`,
    "User-Agent": "repopulse-bot",
    ...options.headers,
  };
  const fetch = (await import("node-fetch")).default;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    throw new Error(`[GitHub API] ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

/**
 * Fetch from GitHub API using a user's token
 * Falls back to global token if user doesn't have one
 */
export async function fetchGithubForUser(
  url: string,
  telegramId: number,
  options: Record<string, any> = {},
) {
  let token = config.GITHUB_TOKEN; // Fallback

  // Try to get user's token
  const user = await getUserByTelegramId(telegramId);
  if (user?.github_token_encrypted && user?.github_token_iv) {
    try {
      token = decryptToken(user.github_token_encrypted, user.github_token_iv);
    } catch (err) {
      console.error(
        `[fetchGithubForUser] Failed to decrypt token for user ${telegramId}:`,
        err,
      );
      // Fall back to global token
    }
  }

  const headers = {
    Authorization: `token ${token}`,
    "User-Agent": "repopulse-bot",
    ...options.headers,
  };

  const fetch = (await import("node-fetch")).default;
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    throw new Error(`[GitHub API] ${res.status} ${res.statusText} for ${url}`);
  }

  return res.json();
}

/**
 * Get the appropriate GitHub token for a user
 * Returns decrypted user token if available, otherwise returns global token
 */
export async function getGithubTokenForUser(
  telegramId: number,
): Promise<string> {
  const user = await getUserByTelegramId(telegramId);

  if (user?.github_token_encrypted && user?.github_token_iv) {
    try {
      return decryptToken(user.github_token_encrypted, user.github_token_iv);
    } catch (err) {
      console.error(
        `[getGithubTokenForUser] Failed to decrypt token for user ${telegramId}:`,
        err,
      );
    }
  }

  return config.GITHUB_TOKEN;
}
