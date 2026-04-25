/**
 * Loads `backend/.env` for Vitest (`vitest.config.ts` → `setupFiles`).
 * Configure `.env` first (`README.md` → Testing). For real storage/DB in `test/unit-test/libs/`,
 * always delete test data (e.g. `finally` + destroy/remove).
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });

process.env.NODE_ENV = "test";
