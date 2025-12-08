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

export async function getSubscriptionByRepo(
  userId: number,
  repoFullName: string
): Promise<SubscriptionRecord | null> {
  const sql = `
    SELECT s.id,
           s.user_id as "userId",
           s.repo_id as "repoId",
           s.filters
    FROM subscriptions s
    INNER JOIN repositories r ON s.repo_id = r.id
    WHERE s.user_id = $1 AND r.full_name = $2
  `;
  const result = await query<SubscriptionRecord>(sql, [userId, repoFullName]);
  return result.rows[0] ?? null;
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
