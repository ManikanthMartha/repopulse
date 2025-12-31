import { query } from './index';

export interface SubscriptionFilters {
  include?: string[];
  exclude?: string[];
}

export interface SubscriptionRecord {
  id: number;
  userId: number;
  repoId: number;
  filters: SubscriptionFilters;
}

export interface RepoState {
  user_id: number;
  repo_id: number;
  last_issue_check: Date | null;
  last_pr_check: Date | null;
}

export interface UserRecord {
  id: number;
  telegram_id: number;
  github_token_encrypted: string | null;
  github_token_iv: string | null;
  github_username: string | null;
  repo_limit: number;
  is_connected: boolean;
  created_at: Date;
}

export async function upsertUser(telegramId: number): Promise<number> {
  const sql = `
    INSERT INTO users (telegram_id)
    VALUES ($1)
    ON CONFLICT (telegram_id) DO UPDATE SET telegram_id = EXCLUDED.telegram_id
    RETURNING id
  `;
  const result = await query<{ id: number }>(sql, [telegramId]);
  return result.rows[0]?.id as number;
}

export async function upsertRepository(fullName: string): Promise<number> {
  const sql = `
    INSERT INTO repositories (full_name)
    VALUES ($1)
    ON CONFLICT (full_name) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id
  `;
  const result = await query<{ id: number }>(sql, [fullName]);
  return result.rows[0]?.id as number;
}

export async function saveSubscription(
  userId: number,
  repoId: number,
  filters: SubscriptionFilters
): Promise<SubscriptionRecord> {
  const sql = `
    INSERT INTO subscriptions (user_id, repo_id, filters)
    VALUES ($1, $2, $3::jsonb)
    ON CONFLICT (user_id, repo_id)
    DO UPDATE SET filters = EXCLUDED.filters
    RETURNING id, user_id as "userId", repo_id as "repoId", filters
  `;
  const result = await query<SubscriptionRecord>(sql, [userId, repoId, JSON.stringify(filters)]);
  return result.rows[0];
}

export async function removeSubscription(
  userId: number,
  repoId: number
): Promise<SubscriptionRecord> {
    const sql = `
      DELETE FROM subscriptions
      WHERE user_id = $1 AND repo_id = $2
      RETURNING id, user_id as "userId", repo_id as "repoId", filters
    `;
    const result = await query<SubscriptionRecord>(sql, [userId, repoId]);
    return result.rows[0];
}

export async function getSubscriptionByRepo(
  telegramId: number,
  repoFullName: string
): Promise<SubscriptionRecord | null> {
  const sql = `
    SELECT s.id,
           s.user_id as "userId",
           s.repo_id as "repoId",
           s.filters
    FROM subscriptions s
    INNER JOIN repositories r ON s.repo_id = r.id
    INNER JOIN users u ON s.user_id = u.id
    WHERE u.telegram_id = $1 AND r.full_name = $2
  `;
  const result = await query<SubscriptionRecord>(sql, [telegramId, repoFullName]);
  return result.rows[0] ?? null;
}

export async function getUserRepos(telegramId: number): Promise<string[]> {
  const sql = `SELECT r.full_name FROM subscriptions s INNER JOIN repositories r ON s.repo_id = r.id INNER JOIN users u ON s.user_id = u.id WHERE u.telegram_id = $1`;
  const result = await query<{ full_name: string }>(sql, [telegramId]);
  return result.rows.map((r) => r.full_name);
}

export async function isEventProcessed(deliveryId: string): Promise<boolean> {
  const sql = 'SELECT 1 FROM processed_events WHERE id = $1';
  const result = await query(sql, [deliveryId]);
  return (result.rowCount ?? 0) > 0;
}

export async function markEventProcessed(deliveryId: string): Promise<void> {
  const sql = 'INSERT INTO processed_events (id) VALUES ($1) ON CONFLICT DO NOTHING';
  await query(sql, [deliveryId]);
}

export async function getRepoState(userId: number, repoId: number): Promise<RepoState | null> {
  const sql = `SELECT user_id, repo_id, last_issue_check, last_pr_check FROM user_repo_state WHERE user_id = $1 AND repo_id = $2`;
  const result = await query<RepoState>(sql, [userId, repoId]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    user_id: row.user_id,
    repo_id: row.repo_id,
    last_issue_check: row.last_issue_check ? new Date(row.last_issue_check) : null,
    last_pr_check: row.last_pr_check ? new Date(row.last_pr_check) : null,
  };
}

export async function updateRepoState(userId: number, repoId: number, lastIssueCheck: Date, lastPRCheck: Date): Promise<void> {
  const sql = `
    INSERT INTO user_repo_state (user_id, repo_id, last_issue_check, last_pr_check)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, repo_id)
    DO UPDATE SET last_issue_check = $3, last_pr_check = $4
  `;
  await query(sql, [userId, repoId, lastIssueCheck.toISOString(), lastPRCheck.toISOString()]);
}

export async function setInitialRepoState(userId: number, repoId: number, lastIssueCheck: Date, lastPRCheck: Date): Promise<void> {
  const sql = `
    INSERT INTO user_repo_state (user_id, repo_id, last_issue_check, last_pr_check)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, repo_id) DO NOTHING
  `;
  await query(sql, [userId, repoId, lastIssueCheck.toISOString(), lastPRCheck.toISOString()]);
}

export async function getUserIdByTelegramId(telegramId: number): Promise<number | null> {
  const sql = `SELECT id FROM users WHERE telegram_id = $1`;
  const result = await query<{ id: number }>(sql, [telegramId]);
  return result.rows[0]?.id ?? null;
}

export async function getRepoIdByFullName(fullName: string): Promise<number | null> {
  const sql = `SELECT id FROM repositories WHERE full_name = $1`;
  const result = await query<{ id: number }>(sql, [fullName]);
  return result.rows[0]?.id ?? null;
}

// ============== GitHub OAuth & User Management ==============

export async function getUserByTelegramId(telegramId: number): Promise<UserRecord | null> {
  const sql = `
    SELECT id, telegram_id, github_token_encrypted, github_token_iv, 
           github_username, repo_limit, is_connected, created_at
    FROM users WHERE telegram_id = $1
  `;
  const result = await query<UserRecord>(sql, [telegramId]);
  return result.rows[0] ?? null;
}

export async function saveGitHubToken(
  telegramId: number, 
  encryptedToken: string, 
  iv: string, 
  githubUsername: string
): Promise<void> {
  const sql = `
    UPDATE users 
    SET github_token_encrypted = $2, 
        github_token_iv = $3, 
        github_username = $4,
        is_connected = TRUE
    WHERE telegram_id = $1
  `;
  await query(sql, [telegramId, encryptedToken, iv, githubUsername]);
}

export async function disconnectGitHub(telegramId: number): Promise<void> {
  const sql = `
    UPDATE users 
    SET github_token_encrypted = NULL, 
        github_token_iv = NULL, 
        github_username = NULL,
        is_connected = FALSE
    WHERE telegram_id = $1
  `;
  await query(sql, [telegramId]);
}

export async function getUserSubscriptionCount(telegramId: number): Promise<number> {
  const sql = `
    SELECT COUNT(*) as count 
    FROM subscriptions s
    INNER JOIN users u ON s.user_id = u.id
    WHERE u.telegram_id = $1
  `;
  const result = await query<{ count: string }>(sql, [telegramId]);
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function getUserRepoLimit(telegramId: number): Promise<number> {
  const sql = `SELECT repo_limit FROM users WHERE telegram_id = $1`;
  const result = await query<{ repo_limit: number }>(sql, [telegramId]);
  return result.rows[0]?.repo_limit ?? 5;
}

// ============== OAuth State Management ==============

export async function saveOAuthState(state: string, telegramId: number): Promise<void> {
  const sql = `
    INSERT INTO oauth_states (state, telegram_id)
    VALUES ($1, $2)
  `;
  await query(sql, [state, telegramId]);
}

export async function getAndDeleteOAuthState(state: string): Promise<number | null> {
  const sql = `
    DELETE FROM oauth_states 
    WHERE state = $1 AND expires_at > NOW()
    RETURNING telegram_id
  `;
  const result = await query<{ telegram_id: number }>(sql, [state]);
  return result.rows[0]?.telegram_id ?? null;
}

export async function cleanupExpiredOAuthStates(): Promise<void> {
  const sql = `DELETE FROM oauth_states WHERE expires_at < NOW()`;
  await query(sql);
}
