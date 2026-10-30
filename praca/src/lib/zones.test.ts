import { describe, expect, it } from "vitest";
import { decodeZones, encodeZones, zonesToMultiPolygon } from "./zones";

const tri = [[-9.15, 38.72], [-9.12, 38.72], [-9.135, 38.75]] as [number, number][];

describe("zones", () => {
  it("round-trips several zones", () => {
    const z = [tri, tri.map(([x, y]) => [x + 0.1, y] as [number, number])];
    expect(decodeZones(encodeZones(z))).toEqual(z);
  });
  it("drops invalid zones and out-of-country points", () => {
    expect(decodeZones("1,2;3,4;5,6")).toEqual([]);
    expect(decodeZones("-9.1,38.7;-9.2,38.7")).toEqual([]);
    expect(decodeZones("abc")).toEqual([]);
    expect(decodeZones(undefined)).toEqual([]);
  });
  it("caps the number of zones", () => {
    const many = Array.from({ length: 9 }, () => encodeZones([tri])).join("|");
    expect(decodeZones(many).length).toBe(5);
  });
  it("closes rings for PostGIS", () => {
    const mp = zonesToMultiPolygon([tri]);
    const ring = mp.coordinates[0]![0]!;
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring.length).toBe(4);
  });
});
