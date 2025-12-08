import express from "express";
import { githubWebhookHandler } from "./github/webhook";

export function initServer(port: string | number) {
  const app = express();
  app.use(express.json());

  // Health route
  app.get("/", (_, res) => res.send("RepoPulse backend running"));

  // GitHub Webhook endpoint
  app.post("/github/webhook", githubWebhookHandler);

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
