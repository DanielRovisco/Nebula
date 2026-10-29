import postgres from "postgres";
import { loadEnv } from "./_env";

loadEnv();

async function main() {
  if (process.env.NEXT_PUBLIC_APP_ENV === "production") throw new Error("Refusing to reset a production database");
  const sql = postgres(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
  await sql.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await sql.end();
  console.log("✓ schema dropped — run pnpm db:migrate && pnpm db:seed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
