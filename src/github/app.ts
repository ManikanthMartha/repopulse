import { config } from "../config";
let githubApp: any;

export async function initGitHubApp() {
  const { App } = await import("@octokit/app");
  githubApp = new App({
    appId: config.GITHUB_APP_ID,
    privateKey: config.GITHUB_PRIVATE_KEY,
    webhooks: {
      secret: config.GITHUB_WEBHOOK_SECRET,
    }
  });
  console.log("🐙 GitHub App initialized");
}

export { githubApp };
