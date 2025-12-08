import { Request, Response } from "express";
import { githubApp } from "./app";

export function githubWebhookHandler(req: Request, res: Response) {
  try {
    githubApp.webhooks.receive({
      id: req.headers["x-github-delivery"] as string,
      name: String(req.headers["x-github-event"]),
      payload: req.body,
    });

    return res.status(200).send("ok");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).send("failed");
  }
}
