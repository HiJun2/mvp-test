import { jsonResponse } from "../_shared/http";
import { getDb, type PagesContext } from "../_shared/types";

type TableRow = {
  name: string;
};

export async function onRequestGet({ env }: PagesContext) {
  const db = getDb(env);
  const checks = {
    dbBinding: Boolean(db),
    recordingsBinding: Boolean(env.RECORDINGS),
    sessionSecret: Boolean(env.SESSION_SECRET),
    tables: [] as string[],
  };

  if (db) {
    try {
      const { results } = await db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      ).all<TableRow>();
      checks.tables = results.map((row) => row.name);
    } catch {
      checks.tables = ["D1 query failed"];
    }
  }

  return jsonResponse(checks);
}
