import { z } from "zod";

/** What every adapter must produce from its source format: loosely-typed rows, one per advert. */
export type RawRecord = Record<string, unknown>;

export interface ParseResult {
  records: RawRecord[];
  /** Problems found while reading the file itself (not row validation). */
  warnings: string[];
}

export interface AdapterContext {
  /** CSV only: maps our field names to the file's column headers. */
  mapping?: Record<string, string>;
}

/**
 * Pluggable source contract. An adapter turns bytes into raw records; normalisation, validation, geocoding,
 * dedupe and persistence are shared (pipeline.ts), so a new source only needs a parser.
 */
export interface SourceAdapter {
  readonly id: string;
  readonly name: string;
  readonly formats: readonly string[];
  parse(input: string, ctx?: AdapterContext): ParseResult;
}

const num = z.number().finite();
const opt = <T extends z.ZodType>(s: T) => s.optional().nullable();

export const normalizedListingSchema = z.object({
  externalId: z.string().min(1).max(120),
  business: z.enum(["sale", "rent"]),
  type: z.enum(["apartment", "house", "land", "shop", "office", "warehouse", "garage", "building"]),
  typology: opt(z.number().int().min(0).max(5)),
  price: num.positive().max(1e9),
  usableArea: opt(num.positive().max(1e6)),
  grossArea: opt(num.positive().max(1e6)),
  plotArea: opt(num.positive().max(1e7)),
  bedrooms: opt(z.number().int().min(0).max(30)),
  bathrooms: opt(z.number().int().min(0).max(30)),
  yearBuilt: opt(z.number().int().min(1500).max(2100)),
  floor: opt(z.number().int().min(-5).max(80)),
  condition: opt(z.enum(["new", "used", "to_renovate", "under_construction"])),
  energyClass: opt(z.enum(["A+", "A", "B", "B-", "C", "D", "E", "F", "exempt"])),
  parkingSpaces: opt(z.number().int().min(0).max(50)),
  elevator: opt(z.boolean()),
  balcony: opt(z.boolean()),
  terrace: opt(z.boolean()),
  pool: opt(z.boolean()),
  garden: opt(z.boolean()),
  furnished: opt(z.boolean()),
  petsAllowed: opt(z.boolean()),
  address: opt(z.string().max(300)),
  postalCode: opt(z.string().regex(/^\d{4}-\d{3}$/)),
  parishName: opt(z.string().max(120)),
  municipalityName: opt(z.string().max(120)),
  districtName: opt(z.string().max(120)),
  lat: opt(z.number().min(29).max(43)),
  lng: opt(z.number().min(-35).max(-5)),
  title: z.string().min(1).max(300),
  description: opt(z.string().max(10000)),
  advertiserType: z.enum(["private", "professional"]).default("professional"),
  advertiserName: opt(z.string().max(160)),
  contactEmail: opt(z.string().max(200)),
  contactPhone: opt(z.string().max(40)),
  url: opt(z.string().url().max(500)),
  imageUrls: z.array(z.string().url().max(600)).max(60).default([]),
  photoHashes: z.array(z.string().regex(/^[0-9a-f]{16}$/i)).max(60).optional(),
  publishedAt: opt(z.date()),
});

export type NormalizedListing = z.infer<typeof normalizedListingSchema>;

export interface RunStats {
  received: number;
  created: number;
  updated: number;
  merged: number;
  rejected: number;
  review: number;
  withdrawn: number;
}

export type RunMode = "incremental" | "full";
