import { jsonResponse } from "../_shared/http";
import type { PagesContext } from "../_shared/types";

type TableRow = {
  name: string;
};

export async function onRequestGet({ env }: PagesContext) {
  const checks = {
    dbBinding: Boolean(env.DB),
    recordingsBinding: Boolean(env.RECORDINGS),
    sessionSecret: Boolean(env.SESSION_SECRET),
    tables: [] as string[],
  };

  if (env.DB) {
    try {
      const { results } = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      ).all<TableRow>();
      checks.tables = results.map((row) => row.name);
    } catch {
      checks.tables = ["D1 query failed"];
    }
  }

  return jsonResponse(checks);
}
