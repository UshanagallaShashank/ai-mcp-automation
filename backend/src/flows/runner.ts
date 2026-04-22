"use strict";

import type { FunctionCall } from "@google/genai";
import { createPartFromFunctionResponse } from "@google/genai";
import { buildChat } from "../agents/gemini.js";
import { getMcpTools, closeMcpClient, type McpTool } from "../tools/mcp-client.js";
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
    let res = await chat.sendMessage({ message: `Goal: ${flow.goal}\nStart at: ${flow.startUrl}` });
    for (let i = 0; i < MAX_TURNS; i++) {
      const calls = res.functionCalls ?? [];
      if (!calls.length) return { status: "ok", output: res.text ?? "", durationMs: Date.now() - t0 };
      res = await chat.sendMessage({ message: await callTools(calls, toolMap) });
    }
    return { status: "failed", output: "max turns reached", durationMs: Date.now() - t0 };
  } catch (e) {
    return { status: "failed", output: "", durationMs: Date.now() - t0, error: String(e) };
  } finally {
    await closeMcpClient();
  }
}
