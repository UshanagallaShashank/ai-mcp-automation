"use strict";

export interface FlowDef {
  readonly name: string;
  readonly goal: string;
  readonly startUrl: string;
}

export interface FlowResult {
  readonly status: "ok" | "failed";
  readonly output: string;
  readonly durationMs: number;
  readonly error?: string;
}
