/**
 * Documented stubs for sources that need a licence or agreement before use. They exist so the pipeline, the admin and
 * docs/DATA_SOURCES.md agree on what is missing for production. Calling `fetch()` always fails loudly.
 */
export interface SourceStub {
  id: string;
  name: string;
  status: "stub" | "planned";
  needs: string;
  docs: string;
}

export class LicenceRequiredError extends Error {
  constructor(source: string, needs: string) {
    super(`${source}: fonte não ligada. Requer ${needs}.`);
    this.name = "LicenceRequiredError";
  }
}

export const SOURCE_STUBS: SourceStub[] = [
  { id: "transactions-partner", name: "Preços de transação (parceiro)", status: "stub", needs: "acordo comercial com um fornecedor de dados agregados e anonimizados de transações", docs: "docs/DATA_SOURCES.md#precos-de-transacao" },
  { id: "predial-at", name: "Registo predial / Autoridade Tributária", status: "stub", needs: "licença ou protocolo com o IRN e a AT", docs: "docs/DATA_SOURCES.md#registo-predial" },
  { id: "ine-housing", name: "INE — estatísticas da habitação", status: "planned", needs: "adaptador da API do INE (dados abertos, citar a fonte)", docs: "docs/DATA_SOURCES.md#ine" },
  { id: "bdp-rates", name: "Banco de Portugal / EMMI — taxas", status: "planned", needs: "adaptador das séries estatísticas do BdP", docs: "docs/DATA_SOURCES.md#taxas" },
  { id: "osm-poi", name: "OpenStreetMap — pontos de interesse", status: "planned", needs: "extração por região (ODbL, atribuição obrigatória)", docs: "docs/DATA_SOURCES.md#osm" },
];

export async function fetchStub(id: string): Promise<never> {
  const s = SOURCE_STUBS.find((x) => x.id === id);
  throw new LicenceRequiredError(s?.name ?? id, s?.needs ?? "licença");
}
