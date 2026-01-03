import express, { Router } from "express";
import { config } from "../config";
import {
  getAndDeleteOAuthState,
  saveGitHubToken,
  getUserByTelegramId,
} from "../db/queries";
import { encryptToken } from "../utils/crypto";
import { getBot } from "../bot/bot";

const router: Router = express.Router();

/**
 * GitHub OAuth callback handler
 * GitHub redirects here after user authorizes the app
 */
router.get("/github/callback", async (req, res) => {
  const { code, state } = req.query;

  console.log("[OAuth] Callback received:", { code: !!code, state: !!state });

  if (!code || !state) {
    console.error("[OAuth] Missing code or state");
    return res.status(400).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Authorization Failed</h2>
          <p>Missing authorization code or state.</p>
          <p>Please try again from Telegram.</p>
        </body>
      </html>
    `);
  }

  try {
    // Verify state and get telegram_id
    console.log("[OAuth] Verifying state:", state);
    const telegramId = await getAndDeleteOAuthState(state as string);
    console.log("[OAuth] Telegram ID from state:", telegramId);

    if (!telegramId) {
      console.error("[OAuth] State not found or expired");
      return res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Authorization Expired</h2>
            <p>The authorization link has expired or was already used.</p>
            <p>Please request a new link from Telegram using /connect</p>
          </body>
        </html>
      `);
    }

    // Exchange code for access token
    console.log("[OAuth] Exchanging code for token");
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: config.GITHUB_CLIENT_ID,
          client_secret: config.GITHUB_CLIENT_SECRET,
          code,
        }),
      },
    );

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    console.log("[OAuth] Token response:", {
      hasToken: !!tokenData.access_token,
      error: tokenData.error,
    });

    if (tokenData.error || !tokenData.access_token) {
      console.error("[OAuth] GitHub OAuth error:", tokenData);
      return res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Authorization Failed</h2>
            <p>${tokenData.error_description || "Failed to get access token"}</p>
            <p>Please try again from Telegram.</p>
          </body>
        </html>
      `);
    }

    // Get GitHub user info
    console.log("[OAuth] Fetching GitHub user info");
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${tokenData.access_token}`,
        "User-Agent": "repopulse-bot",
      },
    });

    const userData = (await userResponse.json()) as { login?: string };
    const githubUsername = userData.login || "Unknown";
    console.log("[OAuth] GitHub username:", githubUsername);

    // Encrypt and save the token
    console.log("[OAuth] Encrypting and saving token for user:", telegramId);
    const { encrypted, iv } = encryptToken(tokenData.access_token);
    await saveGitHubToken(telegramId, encrypted, iv, githubUsername);
    console.log("[OAuth] Token saved successfully");

    // Notify user via Telegram
    const bot = getBot();
    if (bot) {
      console.log("[OAuth] Sending Telegram notification to:", telegramId);
      try {
        await bot.sendMessage(
          telegramId,
          `✅ GitHub connected successfully!\n\n` +
            `👤 Connected as: @${githubUsername}\n\n` +
            `You now have access to track up to 5 repositories.\n` +
            `Use /subscribe <repo> to start tracking!`,
        );
        console.log("[OAuth] Telegram message sent successfully");
      } catch (botError) {
        console.error("[OAuth] Failed to send Telegram message:", botError);
      }
    } else {
      console.error("[OAuth] Bot instance not available");
    }

    return res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>✅ GitHub Connected!</h2>
          <p>Welcome, <strong>@${githubUsername}</strong>!</p>
          <p>You can now close this window and return to Telegram.</p>
          <p style="margin-top: 30px; color: #666;">
            RepoPulse will use your GitHub account to track repositories.
          </p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("[OAuth] Callback error:", error);
    return res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Something went wrong</h2>
          <p>Please try again from Telegram using /connect</p>
          <p style="color: #999; font-size: 12px;">Error: ${error instanceof Error ? error.message : "Unknown"}</p>
        </body>
      </html>
    `);
  }
});

/**
 * Status check endpoint (optional, for debugging)
 */
router.get("/status/:telegramId", async (req, res) => {
  const telegramId = parseInt(req.params.telegramId, 10);

  if (isNaN(telegramId)) {
    return res.status(400).json({ error: "Invalid telegram ID" });
  }

  const user = await getUserByTelegramId(telegramId);

  if (!user) {
    return res.json({ connected: false, exists: false });
  }

  return res.json({
    connected: user.is_connected,
    githubUsername: user.github_username,
    repoLimit: user.repo_limit,
  });
});

export default router;
