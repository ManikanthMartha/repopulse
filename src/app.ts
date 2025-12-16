import { initBot } from "./bot/bot";
import { initServer } from "./server";
import { initDB } from "./db";
import { config } from "./config";

async function bootstrap() {
  console.log("Starting RepoPulse...");

  await initDB();
  initBot();
  await import('./github/poller.js');
  initServer(config.PORT);

  console.log("RepoPulse running");
}

bootstrap();