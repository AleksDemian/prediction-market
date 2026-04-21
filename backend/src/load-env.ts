import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

// Loads env files before any other module reads process.env.
// Order: repo-root .env first (shared with docker-compose + frontend),
// then backend/.env as an optional override-free local file.
// Neither file is required — missing files are skipped silently.
const candidates = [
  resolve(__dirname, "../../.env"),
  resolve(__dirname, "../.env"),
];

for (const path of candidates) {
  if (existsSync(path)) {
    loadEnv({ path, override: false });
  }
}
