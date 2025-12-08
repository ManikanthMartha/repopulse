import { initBot } from "./bot/bot";
import { initServer } from "./server";
import { initDB } from "./db";
import { initGitHubApp } from "./github/app";
import { config } from "./config";

async function bootstrap() {
  console.log("Starting RepoPulse...");

  await initDB();
  // initGitHubApp();
  initBot();
  initServer(config.PORT);

  console.log("RepoPulse running");
}

bootstrap();