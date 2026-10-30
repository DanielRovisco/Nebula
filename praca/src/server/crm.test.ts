import { afterAll, describe, expect, it } from "vitest";
import { csvCell } from "./crm";

describe("csvCell", () => {
  it("quotes separators and neutralises formula injection", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("+351 910 000 000")).toBe("'+351 910 000 000");
    expect(csvCell(null)).toBe("");
  });
});

const hasDb = await (async () => {
  if (!process.env.DATABASE_URL) return false;
  try {
    const postgres = (await import("postgres")).default;
    const c = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 3 });
    await c`select 1 from crm_deals limit 1`;
    await c.end();
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasDb)("CRM tenant isolation (database)", () => {
  const created: { orgs: string[] } = { orgs: [] };
  afterAll(async () => {
    const { sql } = await import("@/db");
    for (const id of created.orgs) await sql`DELETE FROM organizations WHERE id = ${id}`;
    await sql.end();
  });

  it("never returns another organisation's contacts, deals, notes or tasks", async () => {
    const { sql } = await import("@/db");
    const crm = await import("./crm");
    const mk = async (n: string) => (await sql<{ id: string }[]>`INSERT INTO organizations (name, slug) VALUES (${n}, ${`${n}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`}) RETURNING id`)[0]!.id;
    const a = await mk("tenant-a");
    const b = await mk("tenant-b");
    created.orgs.push(a, b);
    await sql`INSERT INTO crm_contacts (organization_id, name, kind) VALUES (${a}, 'Contacto A', 'lead'), (${b}, 'Contacto B', 'lead')`;
    const [dealB] = await sql<{ id: string }[]>`INSERT INTO crm_deals (organization_id, title, stage) VALUES (${b}, 'Negócio B', 'new') RETURNING id`;
    await sql`INSERT INTO crm_deals (organization_id, title, stage) VALUES (${a}, 'Negócio A', 'new')`;
    await sql`INSERT INTO crm_notes (organization_id, deal_id, body) VALUES (${b}, ${dealB!.id}, 'segredo de B')`;
    await sql`INSERT INTO crm_tasks (organization_id, deal_id, title) VALUES (${b}, ${dealB!.id}, 'tarefa de B')`;

    expect((await crm.listContacts(a)).map((c) => c.name)).toEqual(["Contacto A"]);
    expect((await crm.listDeals(a)).map((d) => d.title)).toEqual(["Negócio A"]);
    expect(await crm.getDeal(a, dealB!.id)).toBeNull(); // guessing an id from another tenant yields nothing
    expect((await crm.listTasks(a)).length).toBe(0);
    expect((await crm.getDeal(b, dealB!.id))?.notes.length).toBe(1);
    expect(await crm.exportContactsCsv(a)).not.toContain("Contacto B");
    expect(await crm.exportDealsCsv(a)).not.toContain("Negócio B");
  });
});
