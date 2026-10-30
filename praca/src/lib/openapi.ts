import { siteUrl } from "./env";

const err = { description: "Erro", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } };
const auth = [{ bearerAuth: [] }];

const filterParams = [
  ["business", "sale (omissão) ou rent", { type: "string", enum: ["sale", "rent"] }],
  ["tipo", "Tipos separados por vírgula: apartment, house, land, shop, office, warehouse, garage, building", { type: "string" }],
  ["t", "Tipologias 0–5 separadas por vírgula (5 = T5+)", { type: "string", example: "2,3" }],
  ["pmin", "Preço mínimo (€)", { type: "number" }],
  ["pmax", "Preço máximo (€)", { type: "number" }],
  ["amin", "Área útil mínima (m²)", { type: "number" }],
  ["amax", "Área útil máxima (m²)", { type: "number" }],
  ["quartos", "Quartos (mín.)", { type: "integer" }],
  ["wc", "Casas de banho (mín.)", { type: "integer" }],
  ["park", "Lugares de estacionamento (mín.)", { type: "integer" }],
  ["elevador", "1 = com elevador", { type: "string", enum: ["1"] }],
  ["varanda", "1 = varanda ou terraço", { type: "string", enum: ["1"] }],
  ["piscina", "1 = com piscina", { type: "string", enum: ["1"] }],
  ["jardim", "1 = com jardim", { type: "string", enum: ["1"] }],
  ["estado", "novo, usado, recuperar, construcao (vírgulas)", { type: "string" }],
  ["energia", "Classes energéticas (a+, a, b, b-, c, d, e, f, exempt)", { type: "string" }],
  ["anunciante", "particular ou profissional", { type: "string", enum: ["particular", "profissional"] }],
  ["descida", "1 = só anúncios com redução de preço", { type: "string", enum: ["1"] }],
  ["pub", "Publicados nos últimos: 1d, 7d, 30d", { type: "string", enum: ["1d", "7d", "30d"] }],
  ["q", "Palavras-chave ou referência (PR-000123)", { type: "string" }],
  ["bbox", "west,south,east,north (WGS84)", { type: "string", example: "-9.3,38.6,-9.0,38.9" }],
  ["zonas", "Zonas desenhadas: \"lng,lat;lng,lat;…|…\" (até 5)", { type: "string" }],
  ["ordem", "relevance, price_asc, price_desc, ppm_asc, date_desc, drop_desc, dom_desc", { type: "string" }],
  ["d", "Código de distrito (2 dígitos)", { type: "string" }],
  ["m", "Código de concelho (4 dígitos)", { type: "string", example: "1111" }],
  ["f", "Código de freguesia (6 dígitos)", { type: "string" }],
  ["limit", "1–50 (omissão 20)", { type: "integer", minimum: 1, maximum: 50, default: 20 }],
  ["cursor", "Cursor devolvido em meta.nextCursor", { type: "string" }],
].map(([name, description, schema]) => ({ name, in: "query", description, required: false, schema }));

/** OpenAPI 3.1 document for /api/v1. Served at /api/v1/openapi.json and rendered in /developers. */
export function buildOpenApi() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Praça API",
      version: "1.0.0",
      summary: "Imóveis, avaliações e indicadores de mercado em Portugal.",
      description: "Todos os preços são preços pedidos em anúncios, salvo indicação em contrário. Cada resposta indica a amostra (n) e a data dos indicadores. Os dados de demonstração têm `isDemo: true`.",
    },
    servers: [{ url: `${siteUrl}/api/v1` }],
    security: auth,
    tags: [{ name: "Imóveis" }, { name: "Avaliação" }, { name: "Mercado" }, { name: "Alertas" }, { name: "Projetos" }],
    paths: {
      "/properties": {
        get: { tags: ["Imóveis"], operationId: "listProperties", summary: "Pesquisar imóveis", description: "Todos os filtros do site, mais geografia e zonas desenhadas. Paginação por cursor.", parameters: filterParams, responses: { "200": { description: "Lista paginada", content: { "application/json": { schema: { $ref: "#/components/schemas/PropertyList" } } } }, "400": err, "401": err, "403": err, "429": err } },
      },
      "/properties/{id}": {
        get: { tags: ["Imóveis"], operationId: "getProperty", summary: "Detalhe de um imóvel", parameters: [{ name: "id", in: "path", required: true, description: "Referência (PR-000123) ou UUID", schema: { type: "string" } }], responses: { "200": { description: "Imóvel", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/PropertyDetail" } } } } } }, "404": err, "401": err, "429": err } },
      },
      "/valuations": {
        post: { tags: ["Avaliação"], operationId: "createValuation", summary: "Avaliar um imóvel (AVM/CMA)", description: "Conta para a quota mensal de avaliações.", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ValuationRequest" } } } }, responses: { "200": { description: "Estimativa com comparáveis", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Valuation" } } } } } }, "400": err, "422": err, "403": err, "429": err } },
      },
      "/market/{geoId}": {
        get: { tags: ["Mercado"], operationId: "getMarket", summary: "Indicadores de mercado de um território", parameters: [{ name: "geoId", in: "path", required: true, description: "PT, distrito (2), concelho (4) ou freguesia (6)", schema: { type: "string", example: "1111" } }, { name: "months", in: "query", schema: { type: "integer", minimum: 1, maximum: 60, default: 24 } }], responses: { "200": { description: "KPIs e séries", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Market" } } } } } }, "404": err, "401": err } },
      },
      "/alerts": {
        post: { tags: ["Alertas"], operationId: "createAlert", summary: "Criar uma pesquisa guardada com alerta", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AlertRequest" } } } }, responses: { "201": { description: "Alerta criado", content: { "application/json": { schema: { type: "object", properties: { data: { type: "object", properties: { id: { type: "string" }, savedSearchId: { type: "string" }, frequency: { type: "string" }, triggers: { type: "array", items: { type: "string" } } } } } } } } }, "400": err, "403": err } },
      },
      "/developments": {
        get: { tags: ["Projetos"], operationId: "listDevelopments", summary: "Novos projetos", parameters: [{ name: "municipality", in: "query", schema: { type: "string" } }, { name: "phase", in: "query", schema: { type: "string", enum: ["planning", "licensing", "construction", "selling", "delivered"] } }, { name: "limit", in: "query", schema: { type: "integer" } }, { name: "cursor", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Lista", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Development" } }, meta: { $ref: "#/components/schemas/Page" } } } } } }, "400": err } },
      },
    },
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", description: "Chave criada em /conta/api (prk_…). Também aceite em X-API-Key." } },
      schemas: {
        Error: { type: "object", required: ["error"], properties: { error: { type: "object", required: ["code", "message"], properties: { code: { type: "string", enum: ["unauthorized", "plan_required", "quota_exceeded", "rate_limited", "invalid_parameter", "invalid_body", "not_found", "insufficient_comparables", "internal_error"] }, message: { type: "string" }, details: {} } } } },
        Page: { type: "object", properties: { total: { type: "integer" }, limit: { type: "integer" }, nextCursor: { type: ["string", "null"] } } },
        PropertySummary: { type: "object", properties: { id: { type: "string", format: "uuid" }, reference: { type: "string", example: "PR-000123" }, listingId: { type: "string" }, business: { type: "string", enum: ["sale", "rent"] }, type: { type: "string" }, typology: { type: ["integer", "null"] }, title: { type: "string" }, price: { type: "number" }, pricePerM2: { type: ["number", "null"] }, priceDropPct: { type: "number" }, usableArea: { type: ["number", "null"] }, bedrooms: { type: ["integer", "null"] }, bathrooms: { type: ["integer", "null"] }, energyClass: { type: ["string", "null"] }, location: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" }, parish: { type: ["string", "null"] }, municipality: { type: ["string", "null"] } } }, advertiserType: { type: "string", enum: ["private", "professional"] }, verified: { type: "boolean" }, publishedAt: { type: "string", format: "date-time" }, listingCount: { type: "integer" }, isDemo: { type: "boolean" }, url: { type: "string" } } },
        PropertyList: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/PropertySummary" } }, meta: { $ref: "#/components/schemas/Page" } } },
        PropertyDetail: { type: "object", description: "Ficha completa: características, localização, anúncio principal, outros anúncios, histórico de preço e media." },
        ValuationRequest: { type: "object", required: ["lat", "lng", "type", "area"], properties: { lat: { type: "number", minimum: 29, maximum: 43 }, lng: { type: "number", minimum: -35, maximum: -5 }, type: { type: "string", enum: ["apartment", "house", "shop", "office", "warehouse", "garage", "building"] }, typology: { type: "integer", minimum: 0, maximum: 5 }, area: { type: "number", minimum: 10 }, yearBuilt: { type: "integer" }, condition: { type: "string", enum: ["new", "used", "to_renovate", "under_construction"] }, floor: { type: "integer" }, elevator: { type: "boolean" }, address: { type: "string" } } },
        Valuation: { type: "object", properties: { estimate: { type: "object", properties: { value: { type: "number" }, low: { type: "number" }, high: { type: "number" }, pricePerM2: { type: "number" }, confidence: { type: "number", minimum: 0, maximum: 1 }, level: { type: "string", enum: ["low", "medium", "high"] }, n: { type: "integer" }, comparables: { type: "array", items: { type: "object" } } } }, rent: { type: ["object", "null"] }, grossYield: { type: ["number", "null"] }, radiusM: { type: "integer" }, computedAt: { type: "string", format: "date-time" }, method: { type: "string" } } },
        Market: { type: "object", properties: { geo: { type: "object", properties: { id: { type: "string" }, level: { type: "string" }, name: { type: "string" } } }, sale: { type: ["object", "null"] }, rent: { type: ["object", "null"] }, series: { type: "object" }, source: { type: "string" }, methodology: { type: "string" } } },
        AlertRequest: { type: "object", required: ["name", "filters"], properties: { name: { type: "string" }, business: { type: "string", enum: ["sale", "rent"] }, filters: { type: "string", description: "Query string do site", example: "tipo=apartment&t=2&pmax=300000&m=1111" }, frequency: { type: "string", enum: ["instant", "daily", "weekly"] }, triggers: { type: "array", items: { type: "string", enum: ["new_listing", "price_drop", "back_on_market", "sold_or_withdrawn"] } } } },
        Development: { type: "object", properties: { id: { type: "string" }, slug: { type: "string" }, name: { type: "string" }, developer: { type: "string" }, phase: { type: "string" }, municipality: { type: ["string", "null"] }, totalUnits: { type: ["integer", "null"] }, availableUnits: { type: ["integer", "null"] }, expectedDelivery: { type: ["string", "null"] }, priceFrom: { type: ["number", "null"] }, isDemo: { type: "boolean" } } },
      },
    },
  } as const;
}
