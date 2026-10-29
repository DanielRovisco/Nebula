/** Public, non-secret runtime config. Secrets are only read in server modules via process.env. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? "development";
export const isProduction = appEnv === "production";

export const entity = {
  name: process.env.NEXT_PUBLIC_ENTITY_NAME ?? "Praça, Lda. (modelo)",
  nif: process.env.NEXT_PUBLIC_ENTITY_NIF ?? "",
  ami: process.env.NEXT_PUBLIC_ENTITY_AMI ?? "",
  address: process.env.NEXT_PUBLIC_ENTITY_ADDRESS ?? "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "ola@praca.example",
};

export const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
