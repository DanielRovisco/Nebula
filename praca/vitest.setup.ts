import { loadEnv } from "./scripts/_env";

// Integration tests read DATABASE_URL from .env.local (CI sets it directly).
loadEnv();
