import { Pool, QueryResult, QueryResultRow } from "pg";
import { config } from "../config";

export const pool = new Pool({ connectionString: config.DATABASE_URL });

export async function initDB() {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected");
  } catch (error) {
    console.log("DB connection failed", error);
    process.exit(1);
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}
