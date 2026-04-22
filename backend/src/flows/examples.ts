"use strict";

import type { FlowDef } from "./types.js";

export const hnFlow: FlowDef = {
  name: "Hacker News Top Stories",
  goal: "Go to Hacker News and list the titles of the top 5 stories. No screenshots.",
  startUrl: "https://news.ycombinator.com",
};

export const wikiFlow: FlowDef = {
  name: "Wikipedia TypeScript",
  goal: "Search Wikipedia for TypeScript, then return the first paragraph of the article. No screenshots.",
  startUrl: "https://en.wikipedia.org",
};

export const flows: Record<string, FlowDef> = {
  hn: hnFlow,
  wiki: wikiFlow,
};
