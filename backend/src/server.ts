import "dotenv/config";
import { execSync } from "node:child_process";
import { createApp } from "./app";
import { loadServerEnv } from "./libs/configs/env.config";
import { createProductionDependencies } from "./production";

const env = loadServerEnv();
const app = createApp(createProductionDependencies(env));

const server = app.listen(env.PORT, () => {
  const baseUrl = `http://localhost:${env.PORT}`;
  console.log(`backend listening on ${baseUrl}`);
  console.log(`Scalar API docs UI: ${baseUrl}/docs`);
  console.log(`OpenAPI spec (YAML): ${baseUrl}/openapi.yaml`);

  if (env.SCALAR_DOCS_URL) {
    console.log(`Scalar-hosted API reference (optional): ${env.SCALAR_DOCS_URL}`);
  }
});

server.on("error", (error: unknown) => {
  if (!isAddressInUseError(error)) {
    throw error;
  }

  // During local dev, try to free the port by killing *only* Node processes
  // already listening on it (we never kill unrelated apps like Cursor).
  if ((process.env.NODE_ENV ?? "development") === "production") {
    throw error;
  }

  const port = env.PORT;
  const holders = listPortHolders(port);
  const nodePids = holders.filter((h) => isNodeLikeCommand(h.command)).map((h) => h.pid);
  const nonNode = holders.filter((h) => !isNodeLikeCommand(h.command));

  if (nodePids.length === 0 || nonNode.length > 0) {
    const details = holders.length
      ? holders.map((h) => `${h.command}(pid=${h.pid})`).join(", ")
      : "unknown process";
    throw new Error(
      `PORT ${port} is already in use by ${details}. ` +
        `Refusing to kill non-node processes; change PORT or close the conflicting app.`
    );
  }

  for (const pid of nodePids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // ignore
    }
  }

  setTimeout(() => {
    app.listen(port, () => {
      const baseUrl = `http://localhost:${port}`;
      console.log(`backend listening on ${baseUrl}`);
      console.log(`Scalar API docs UI: ${baseUrl}/docs`);
      console.log(`OpenAPI spec (YAML): ${baseUrl}/openapi.yaml`);
    });
  }, 300);
});

type PortHolder = { pid: number; command: string };

function isAddressInUseError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "EADDRINUSE";
}

function isNodeLikeCommand(command: string): boolean {
  const c = command.toLowerCase();
  return c === "node" || c.includes("node") || c.includes("tsx") || c.includes("ts-node") || c.includes("nodemon");
}

function listPortHolders(port: number): PortHolder[] {
  try {
    // lsof output: "COMMAND PID"
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -Fpc`, { encoding: "utf8" });
    const holders: PortHolder[] = [];
    let currentPid: number | null = null;
    let currentCommand: string | null = null;

    for (const line of out.split("\n")) {
      if (!line) continue;
      const tag = line[0];
      const value = line.slice(1);
      if (tag === "p") {
        currentPid = Number(value);
      } else if (tag === "c") {
        currentCommand = value;
      }
      if (currentPid && currentCommand) {
        holders.push({ pid: currentPid, command: currentCommand });
        currentPid = null;
        currentCommand = null;
      }
    }

    // De-dupe
    const seen = new Set<string>();
    return holders.filter((h) => {
      const key = `${h.pid}:${h.command}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}
