# automation-mcp

A web automation agent that reads a plain-English goal, opens a real browser, and clicks/types/scrapes its way to an answer — fully autonomously. Powered by **Google Gemini** and **Playwright MCP**.

---

## What is this, and why does it exist?

Imagine you want to go to Flipkart, find Sony headphones under ₹15,000, and add one to your cart. Normally you'd write brittle Puppeteer/Playwright scripts that break whenever the site changes a CSS class.

This project does it differently: you just write *what you want*, not *how to do it*. The AI figures out the how. If the page layout changes tomorrow, the agent adapts — because it's reading the page visually like a human would, not matching selectors.

---

## The big picture (explain like I'm 5)

Think of it like hiring an assistant to browse the web for you:

```
You write a goal  →  Gemini reads it  →  Gemini says "click this button"
                                        →  Browser actually clicks it
                                        →  Browser reports back what happened
                                        →  Gemini says "now type this"
                                        →  ... repeats until done
                                        →  Gemini writes you a summary
```

You are the manager. Gemini is the worker who thinks. Playwright is the hands that actually touch the browser.

---

## What is MCP?

**MCP = Model Context Protocol.**

It is a standard invented by Anthropic that lets AI models talk to external tools (like a browser, a database, or a filesystem) in a structured way. Think of it like a universal plug — any AI that speaks MCP can use any tool that speaks MCP, without custom glue code.

In this project, `@playwright/mcp` is an MCP **server** that wraps a real Chromium browser. When Gemini wants to click something, it sends an MCP-formatted request. The server receives it, tells Playwright to click, and sends the result back.

```
Gemini  ──[MCP request]──►  Playwright MCP Server  ──►  Chromium browser
        ◄──[MCP result]──                           ◄──  page response
```

### Why MCP instead of calling Playwright directly?

Because MCP is a standard. Tomorrow you could swap `@playwright/mcp` for `@filesystem/mcp` or `@postgres/mcp` and the AI side of the code stays exactly the same. No rewiring.

---

## What is a "tool"?

A **tool** is a named action the AI is allowed to take. Each tool has:
- a **name** (e.g. `browser_click`)
- a **description** (so the AI knows when to use it)
- an **input schema** (what arguments it needs)

When Gemini reads your goal, it picks from the list of available tools and calls them one by one — like a chef choosing which knife to use for each cut.

Some tools available from `@playwright/mcp`:

| Tool | What it does |
|---|---|
| `browser_navigate` | Go to a URL |
| `browser_click` | Click an element on the page |
| `browser_type` | Type text into an input field |
| `browser_snapshot` | Read the page's accessibility tree (text + structure) |
| `browser_take_screenshot` | Capture a PNG of the current page |
| `browser_scroll` | Scroll the page up/down |
| `browser_wait_for` | Wait for something to appear |

---

## How the agent navigates (step by step)

Here is exactly what happens when you run `npm run dev`:

### 1. Read the goal
`input.json` is loaded. It has three fields:
```json
{
  "name": "flipkart-scraper",
  "goal": "Find Sony ANC headphones under ₹15,000 and add to cart",
  "startUrl": "https://www.flipkart.com"
}
```

### 2. Connect to the browser
`mcp-client.ts` launches `@playwright/mcp` as a subprocess. This boots a real Chromium browser in the background. The MCP client lists all available tools from it.

### 3. First message to Gemini
The runner sends this to Gemini:
```
Goal: Find Sony ANC headphones under ₹15,000 and add to cart
Start at: https://www.flipkart.com
```
Along with the full list of browser tools it can use.

### 4. The agent loop
Gemini responds — not with text yet, but with **tool calls**. For example:
```
→ browser_navigate({ url: "https://www.flipkart.com" })
```
The runner executes the tool via MCP, gets the result, and sends it back to Gemini. Gemini then decides what to do next:
```
→ browser_type({ text: "sony anc headphones" })
→ browser_click({ element: "Search button" })
→ browser_snapshot()   ← reads what's on screen
→ browser_click({ element: "Sony WH-1000XM5 ₹12,999" })
→ browser_click({ element: "Add to Cart" })
```
This loop runs for up to **20 turns**. Each turn = one batch of tool calls + Gemini's next decision.

### 5. Final answer
When Gemini has nothing left to click, it returns a plain text summary. That gets printed to your terminal.

---

## Screenshots — why and when

Screenshots (`browser_take_screenshot`) produce a PNG image of what the browser currently sees.

**When does the agent take one?**
- Only when Gemini decides it needs to *see* the page visually — usually when the text-based snapshot (`browser_snapshot`) doesn't give enough information (e.g. image-heavy pages, CAPTCHAs, complex layouts).
- The system prompt explicitly tells Gemini: *"Never take a screenshot unless the goal explicitly requires it."* This keeps runs fast and cheap.

**Where do screenshots go?**
Playwright MCP saves them to `.playwright-mcp/` in your project. This folder is git-ignored.

**Why prefer `browser_snapshot` over screenshots?**
`browser_snapshot` returns the page's **accessibility tree** — a structured text description of every visible element, its role, and its label. It's faster, smaller, and easier for an LLM to parse than a pixel image. Screenshots are a fallback for when structure alone isn't enough.

---

## Reading the terminal logs

Once you add logging (already done), your terminal looks like this:

```
[2026-04-23T10:00:01] INFO  Starting: flipkart-scraper
[2026-04-23T10:00:02] INFO  Connecting to Playwright MCP server...
[2026-04-23T10:00:04] INFO  MCP ready — 25 tools: browser_navigate, browser_click, ...
[2026-04-23T10:00:04] INFO  Sending goal to Gemini: "Find Sony ANC headphones..."
[2026-04-23T10:00:06] INFO  Turn 1: Gemini wants to call 1 tool(s): browser_navigate
[2026-04-23T10:00:06] DEBUG tool call → browser_navigate  args: {"url":"https://www.flipkart.com"}
[2026-04-23T10:00:08] DEBUG tool result ← browser_navigate  (412 chars)
[2026-04-23T10:00:08] INFO  Turn 1: Tool calls complete, sending results back to Gemini...
[2026-04-23T10:00:10] INFO  Turn 2: Gemini wants to call 1 tool(s): browser_type
...
[2026-04-23T10:01:30] INFO  Turn 8: Gemini returned a text response — done
[2026-04-23T10:01:30] DONE  Finished in 86000ms
```

**How to read it:**
- `INFO` lines = high-level agent decisions (what turn, what tool group)
- `DEBUG` lines = exact tool names and arguments being sent to the browser
- `WARN` = something unexpected (max turns hit, cookie banner couldn't be dismissed)
- `ERROR` = crash — check the message for the root cause

---

## Project structure

```
backend/
├── src/
│   ├── index.ts              # Entry — loads input.json, calls runFlow(), prints result
│   ├── agents/
│   │   └── gemini.ts         # Creates the Gemini chat session with the tool list + system prompt
│   ├── flows/
│   │   ├── types.ts          # TypeScript types: FlowDef (input) and FlowResult (output)
│   │   ├── runner.ts         # The agent loop: send goal → get tool calls → execute → repeat
│   │   └── examples.ts       # Pre-built example flows (Hacker News, Wikipedia)
│   ├── tools/
│   │   └── mcp-client.ts     # Launches @playwright/mcp, lists tools, wraps callTool()
│   └── utils/
│       ├── env.ts            # Safe process.env getter (throws if missing)
│       ├── input.ts          # Reads and validates input.json
│       └── logger.ts         # Timestamped logger: info / debug / warn / error / done
├── input.json                # Your task — edit this to change what the agent does
├── .env                      # GOOGLE_API_KEY lives here (git-ignored)
└── .env.example              # Copy this to .env and fill in your key
```

---

## Requirements

- Node.js 20+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

---

## Setup

```bash
cd backend
cp .env.example .env
# open .env and paste your GOOGLE_API_KEY

npm install
npx playwright install chromium
```

---

## Running

Edit `backend/input.json`:

```json
{
  "name": "my-task",
  "goal": "Go to Hacker News and return the titles of the top 5 stories",
  "startUrl": "https://news.ycombinator.com"
}
```

```bash
cd backend
npm run dev
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run directly with `tsx` — no build step needed |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run the compiled build from `dist/` |

---

## Common issues

| Problem | Fix |
|---|---|
| `ERR_MODULE_NOT_FOUND` for `zod-to-json-schema` or `ajv` | `rm -rf node_modules package-lock.json && npm install` |
| `Missing env var: GOOGLE_API_KEY` | Copy `.env.example` → `.env` and add your key |
| Agent hits max turns (20) | Make the goal more specific, or increase `MAX_TURNS` in `runner.ts` |
| Cookie banner blocks navigation | Already handled — the system prompt tells Gemini to dismiss banners first |
| `.playwright-mcp/` files cluttering git | Already git-ignored |
