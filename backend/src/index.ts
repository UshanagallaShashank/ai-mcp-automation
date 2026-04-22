"use strict";

import "dotenv/config";
import { runFlow } from "./flows/runner.js";
import { readInput } from "./utils/input.js";
import { log } from "./utils/logger.js";

async function main(): Promise<void> {
  const flow = readInput();
  log.info(`Starting: ${flow.name}`);
  const result = await runFlow(flow);
  if (result.status === "failed") {
    log.error(result.error ?? "unknown error");
    process.exit(1);
  }
  log.done(`Finished in ${result.durationMs}ms`);
  console.log("\n" + result.output);
}

main().catch((e: unknown) => { log.error(String(e)); process.exit(1); });
