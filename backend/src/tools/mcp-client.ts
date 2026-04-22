"use strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: object;
  call(args: Record<string, unknown>): Promise<string>;
}

let mcpClient: Client | null = null;

export async function getMcpTools(): Promise<McpTool[]> {
  const transport = new StdioClientTransport({ command: "npx", args: ["@playwright/mcp@latest"] });
  mcpClient = new Client({ name: "agent", version: "1.0.0" });
  await mcpClient.connect(transport);
  const { tools } = await mcpClient.listTools();
  console.log(`Registered MCP tools: ${tools.map((t) => t.name).join(", ")}`);
  return tools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    inputSchema: t.inputSchema,
    async call(args: Record<string, unknown>): Promise<string> {
      const res = await mcpClient!.callTool({ name: t.name, arguments: args });
      return (res.content as Array<{ text?: string }>).map((c) => c.text ?? "").join("\n");
    },
  }));
}

export async function closeMcpClient(): Promise<void> {
  await mcpClient?.close();
  mcpClient = null;
}
