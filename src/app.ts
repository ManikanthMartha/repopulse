import { initBot } from "./bot/bot";
import { initServer } from "./server";
import { initDB } from "./db";
import { config } from "./config";
import "./github/poller";

async function bootstrap() {
  console.log("Starting RepoPulse...");

  await initDB();
  initBot();
  initServer(config.PORT);

  console.log("RepoPulse running");
}

bootstrap();