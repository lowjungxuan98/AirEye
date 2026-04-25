import fs from "node:fs";
import path from "node:path";

let cachedVersion: string | null = null;

export function getAppVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  const packageJsonPath = path.resolve(__dirname, "..", "..", "..", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
  cachedVersion = typeof packageJson.version === "string" ? packageJson.version : "unknown";
  return cachedVersion;
}
