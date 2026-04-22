"use strict";

import type { FunctionCall } from "@google/genai";
import { createPartFromFunctionResponse } from "@google/genai";
import { buildChat } from "../agents/gemini.js";
import { getMcpTools, closeMcpClient, type McpTool } from "../tools/mcp-client.js";
import { log } from "../utils/logger.js";
import type { FlowDef, FlowResult } from "./types.js";

const MAX_TURNS = 20;

async function callTools(calls: FunctionCall[], toolMap: Map<string, McpTool>) {
  return Promise.all(calls.map(async (fc) => {
    const result = await toolMap.get(fc.name!)?.call((fc.args ?? {}) as Record<string, unknown>) ?? "tool not found";
    return createPartFromFunctionResponse(fc.id ?? "", fc.name ?? "", { result });
  }));
}

export async function runFlow(flow: FlowDef): Promise<FlowResult> {
  const t0 = Date.now();
  const tools = await getMcpTools();
  const chat = buildChat(tools);
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  try {
    log.info(`Sending goal to Gemini: "${flow.goal}"`);
    let res = await chat.sendMessage({ message: `Goal: ${flow.goal}\nStart at: ${flow.startUrl}` });

    for (let i = 0; i < MAX_TURNS; i++) {
      const calls = res.functionCalls ?? [];

      if (!calls.length) {
        log.info(`Turn ${i + 1}: Gemini returned a text response — done`);
        return { status: "ok", output: res.text ?? "", durationMs: Date.now() - t0 };
      }

      log.info(`Turn ${i + 1}: Gemini wants to call ${calls.length} tool(s): ${calls.map((c) => c.name).join(", ")}`);
      const results = await callTools(calls, toolMap);
      log.info(`Turn ${i + 1}: Tool calls complete, sending results back to Gemini...`);
      res = await chat.sendMessage({ message: results });
    }

    log.warn(`Reached max turns (${MAX_TURNS}) without a final answer`);
    return { status: "failed", output: "max turns reached", durationMs: Date.now() - t0 };
  } catch (e) {
    log.error(`Flow crashed: ${String(e)}`);
    return { status: "failed", output: "", durationMs: Date.now() - t0, error: String(e) };
  } finally {
    await closeMcpClient();
  }
}
