import { describe, expect, it } from "vitest";
import { parseEcbCsv, parseSalesMedians, quarterStart, type IneIndicator } from "./ine";

const fixture: IneIndicator = {
  IndicadorCod: "0014763",
  IndicadorDsg: "Valor mediano das vendas",
  DataUltimoAtualizacao: "2026-10-23",
  Dados: {
    "1.º Trimestre de 2026": [{ geocod: "1A01106", geodsg: "Lisboa", dim_3: "H1", valor: "5100" }],
    "2.º Trimestre de 2026": [
      { geocod: "1A01106", geodsg: "Lisboa", dim_3: "H1", valor: "5192" },
      { geocod: "1A01106", geodsg: "Lisboa", dim_3: "H11", valor: "6434" }, // new builds: another category
      { geocod: "11A1312", geodsg: "Porto", dim_3: "H1", valor: "3631" },
      { geocod: "PT", geodsg: "Portugal", dim_3: "H1", valor: "2264" },
      { geocod: "1", geodsg: "Continente", dim_3: "H1", valor: "2272" }, // region: ignored
      { geocod: "1A0110658", geodsg: "Belém", dim_3: "H1", valor: "5498" }, // parish-level code: ignored
      { geocod: "1500805", geodsg: "Faro", dim_3: "H1" }, // suppressed value: skipped
      { geocod: "1500806", geodsg: "Outro", dim_3: "H1", valor: "x" },
    ],
  },
};

describe("quarterStart", () => {
  it("maps INE labels to the first day of the quarter", () => {
    expect(quarterStart("1.º Trimestre de 2026")).toBe("2026-01-01");
    expect(quarterStart("2.º Trimestre de 2026")).toBe("2026-04-01");
    expect(quarterStart("4.º Trimestre de 2025")).toBe("2025-10-01");
  });
  it("rejects labels that are not quarters", () => {
    expect(quarterStart("2025")).toBeNull();
    expect(quarterStart("5.º Trimestre de 2025")).toBeNull();
  });
});

describe("parseSalesMedians", () => {
  const pts = parseSalesMedians(fixture);
  it("keeps Portugal and municipalities for the total category, across periods", () => {
    expect(pts).toContainEqual({ geoLevel: "municipality", geoCode: "1106", period: "2026-04-01", ppm: 5192 });
    expect(pts).toContainEqual({ geoLevel: "municipality", geoCode: "1106", period: "2026-01-01", ppm: 5100 });
    expect(pts).toContainEqual({ geoLevel: "municipality", geoCode: "1312", period: "2026-04-01", ppm: 3631 });
    expect(pts).toContainEqual({ geoLevel: "country", geoCode: "PT", period: "2026-04-01", ppm: 2264 });
  });
  it("skips other categories, regions, parishes and suppressed values", () => {
    expect(pts.length).toBe(4);
    expect(pts.some((p) => p.ppm === 6434 || p.ppm === 2272 || p.ppm === 5498)).toBe(false);
  });
});

describe("parseEcbCsv", () => {
  const csv = [
    "KEY,FREQ,REF_AREA,CURRENCY,PROVIDER_FM,INSTRUMENT_FM,PROVIDER_FM_ID,DATA_TYPE_FM,TIME_PERIOD,OBS_VALUE,OBS_STATUS,TITLE",
    'FM.M,M,U2,EUR,RT,MM,EURIBOR3MD_,HSTA,2026-08,2.5131429,A,"Euribor 3-month, average"',
    'FM.M,M,U2,EUR,RT,MM,EURIBOR3MD_,HSTA,2026-09,2.6350455,A,"Euribor 3-month, average"',
    'FM.M,M,U2,EUR,RT,MM,EURIBOR3MD_,HSTA,2026-10,,M,"missing"',
  ].join("\n");
  it("reads month and value and skips empty observations", () => {
    expect(parseEcbCsv(csv)).toEqual([{ month: "2026-08-01", value: 2.5131429 }, { month: "2026-09-01", value: 2.6350455 }]);
  });
  it("returns nothing for an unexpected format", () => expect(parseEcbCsv("a,b\n1,2")).toEqual([]));
});
