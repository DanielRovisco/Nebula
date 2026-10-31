import { loadEnv } from "./_env";

loadEnv();

/** Pulls the real open-data sources (INE sales medians, ECB Euribor) into the database. Safe to run any time. */
async function main() {
  const { syncOfficialSources } = await import("../src/server/official-sources");
  const { sql } = await import("../src/db");
  try {
    const r = await syncOfficialSources();
    console.log(JSON.stringify(r, null, 2));
    if (r.errors.length) process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
