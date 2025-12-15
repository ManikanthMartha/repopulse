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
  repo_id: number;
  last_issue_check: Date | null;
  last_pr_check: Date | null;
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

export async function getRepoState(repoId: number): Promise<RepoState | null> {
  const sql = `SELECT repo_id, last_issue_check, last_pr_check FROM repo_state WHERE repo_id = $1`;
  const result = await query<RepoState>(sql, [repoId]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    repo_id: row.repo_id,
    last_issue_check: row.last_issue_check ? new Date(row.last_issue_check) : null,
    last_pr_check: row.last_pr_check ? new Date(row.last_pr_check) : null,
  };
}

export async function updateRepoState(repoId: number, lastIssueCheck: Date, lastPRCheck: Date): Promise<void> {
  const sql = `
    INSERT INTO repo_state (repo_id, last_issue_check, last_pr_check)
    VALUES ($1, $2, $3)
    ON CONFLICT (repo_id)
    DO UPDATE SET last_issue_check = $2, last_pr_check = $3
  `;
  await query(sql, [repoId, lastIssueCheck.toISOString(), lastPRCheck.toISOString()]);
}

export async function setInitialRepoState(repoId: number, lastIssueCheck: Date, lastPRCheck: Date): Promise<void> {
  const sql = `
    INSERT INTO repo_state (repo_id, last_issue_check, last_pr_check)
    VALUES ($1, $2, $3)
    ON CONFLICT (repo_id) DO NOTHING
  `;
  await query(sql, [repoId, lastIssueCheck.toISOString(), lastPRCheck.toISOString()]);
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
