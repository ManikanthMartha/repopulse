# RepoPulse

RepoPulse is a Telegram bot backed by a GitHub App. It keeps developers up to date with filtered repository activity by piping GitHub Issue / Pull Request events into Telegram chats.

## Features

- Telegram bot built with `node-telegram-bot-api`
- GitHub App powered by `@octokit/app` + webhook delivery handling
- Express server that exposes a webhook endpoint for GitHub and incoming bot webhooks
- PostgreSQL persistence for users, repository subscriptions, label filters, and processed webhook IDs
- Label-based include/exclude filtering to limit noise
- Render deployment configuration for a single Node service and managed Postgres instance

## Project Structure

```
src/
  app.ts              # Application entry point
  server.ts           # Express server factory
  bot/                # Telegram bot initialization + commands
  github/             # GitHub App + webhook event handlers
  db/                 # Database pool + query helpers
  services/           # Business logic (subscriptions, filters, notifications)
  utils/              # Reusable utilities (validation)
  types/              # Shared TypeScript interfaces
migrations/           # SQL migrations
.env.example          # Required environment variables
render.yaml           # Render deployment description
```

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Copy and fill environment variables**
   ```bash
   cp .env.example .env
   ```
3. **Run migrations**
   ```bash
   psql "$DATABASE_URL" -f migrations/init.sql
   ```
4. **Start the dev server**
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for the complete list. You will need Telegram bot credentials, GitHub App secrets, and a PostgreSQL connection string.

## Deployment

Render is the target platform. The `render.yaml` file defines both the Node web service and a managed PostgreSQL instance. Push your repo, connect it to Render, and deploy.
