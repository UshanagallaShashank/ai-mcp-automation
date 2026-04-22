"use strict";

import { readFileSync } from "fs";
import { resolve } from "path";
import type { FlowDef } from "../flows/types.js";

export function readInput(filePath = "input.json"): FlowDef {
  const raw = readFileSync(resolve(process.cwd(), filePath), "utf-8");
  const parsed = JSON.parse(raw) as Partial<FlowDef>;
  if (!parsed.name || !parsed.goal || !parsed.startUrl) {
    throw new Error("input.json must have: name, goal, startUrl");
  }
  return parsed as FlowDef;
}
