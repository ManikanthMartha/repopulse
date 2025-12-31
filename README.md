# RepoPulse

RepoPulse is a Telegram bot that keeps developers up to date with filtered repository activity by piping GitHub Issue / Pull Request events into Telegram chats using polling.

## Features

- **GitHub OAuth Integration** - Users connect their own GitHub accounts
- **Per-user API Quotas** - Each user uses their own GitHub API rate limits
- **Repository Limits** - Free tier allows tracking up to 5 repositories
- **Secure Token Storage** - GitHub tokens are encrypted using AES-256-CBC
- Telegram bot built with `node-telegram-bot-api`
- Polls GitHub REST API for repo issues/PRs (including private repos user has access to)
- PostgreSQL persistence for users, repository subscriptions, label filters, and last-seen timestamps
- Label-based include/exclude filtering to limit noise
- Render deployment configuration for a single Node service and managed Postgres instance

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Register and get started |
| `/connect` | Connect your GitHub account via OAuth |
| `/subscribe <repo>` | Subscribe to a GitHub repository |
| `/filter` | Set label filters for your subscriptions |
| `/unsubscribe` | Unsubscribe from a GitHub repository |
| `/status` | View your account status and repo count |
| `/disconnect` | Unlink your GitHub account |

## Project Structure

```
src/
  app.ts              # Application entry point
  server.ts           # Express server factory
  bot/                # Telegram bot initialization + commands
  github/             # GitHub API polling logic
  db/                 # Database pool + query helpers
  routes/             # Express routes (OAuth callback)
  services/           # Business logic (subscriptions, filters, notifications)
  utils/              # Reusable utilities (validation, crypto)
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

2. **Create a GitHub OAuth App**
   - Go to GitHub Settings > Developer settings > OAuth Apps > New OAuth App
   - Set Authorization callback URL to: `http://localhost:8080/auth/github/callback`
   - Copy the Client ID and Client Secret

3. **Copy and fill environment variables**
   ```bash
   cp .env.example .env
   ```
   Required variables:
   - `TELEGRAM_BOT_TOKEN` - Your Telegram bot token from @BotFather
   - `DATABASE_URL` - PostgreSQL connection string
   - `GITHUB_CLIENT_ID` - GitHub OAuth App Client ID
   - `GITHUB_CLIENT_SECRET` - GitHub OAuth App Client Secret
   - `GITHUB_OAUTH_CALLBACK_URL` - OAuth callback URL
   - `ENCRYPTION_KEY` - Secret key for encrypting GitHub tokens
   - `BASE_URL` - Your server's public URL

4. **Run migrations**
   ```bash
   psql "$DATABASE_URL" -f migrations/init.sql
   psql "$DATABASE_URL" -f migrations/002_github_oauth.sql
   ```

5. **Start the dev server**
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for the complete list. You will need:
- Telegram bot credentials
- GitHub OAuth App credentials
- PostgreSQL connection string
- Encryption key for token storage

## Security

- GitHub tokens are encrypted at rest using AES-256-CBC
- OAuth state parameter prevents CSRF attacks
- Tokens are never logged or exposed in responses
- Users can disconnect their GitHub account anytime

## Deployment

Render is the target platform. The `render.yaml` file defines both the Node web service and a managed PostgreSQL instance. Push your repo, connect it to Render, and deploy.

**Important:** Update `GITHUB_OAUTH_CALLBACK_URL` and `BASE_URL` to your production domain.
