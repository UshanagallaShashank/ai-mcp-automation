"use strict";

import { GoogleGenAI } from "@google/genai";
import { getEnv } from "../utils/env.js";
import type { McpTool } from "../tools/mcp-client.js";

export function buildChat(tools: McpTool[]) {
  const ai = new GoogleGenAI({ apiKey: getEnv("GOOGLE_API_KEY") });
  return ai.chats.create({
    model: "gemini-2.5-flash-lite",
    config: {
      temperature: 0,
      systemInstruction: `You are a web automation agent. Complete the given goal fully using the available browser tools.
- Never ask follow-up questions or request clarification — infer and act.
- Never take a screenshot unless the goal explicitly requires it.
- When the goal is complete, return a concise summary of what was accomplished.`,
      tools: [{
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.inputSchema as never,
        })),
      }],
    },
  });
}
