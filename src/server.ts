import express from "express";

export function initServer(port: string | number) {
  const app = express();
  app.use(express.json());

  // Health route
  app.get("/", (_, res) => res.send("RepoPulse backend running"));

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
