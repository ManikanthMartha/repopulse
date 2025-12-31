import express from "express";
import authRoutes from "./routes/auth";

export function initServer(port: string | number) {
  const app = express();
  app.use(express.json());

  // Health route
  app.get("/", (_, res) => res.send("RepoPulse backend running"));

  // GitHub OAuth routes
  app.use("/auth", authRoutes);

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  return app;
}
