import { loadEnv } from "./_env";

loadEnv();

async function main() {
  const { runAlertEngine, sendDigests } = await import("../src/server/alerts");
  const { sql } = await import("../src/db");
  const freq = (process.argv[2] ?? "instant") as "instant" | "daily" | "weekly";
  console.log("engine", await runAlertEngine());
  console.log("digests", await sendDigests(freq));
  await sql.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
