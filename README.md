# FikaAI

FikaAI is a local, offline-first agent. The same assistant answers through a web page, an SMS simulator, and a USSD simulator. Nothing in the demo calls a paid API, SMS gateway, USSD aggregator, or hosted database.

The project is JavaScript on Node.js 22. Replies are in English or Kiswahili. Mixed sentences such as “Nataka kujua how I can record my sale.” are understood. That is the language coverage that has been exercised. Other African languages are not wired up yet; add them as new string catalogs.

## Architecture

```text
Web / SMS simulator / USSD simulator
        │
 Adaptive gateway
        │
 Agent orchestrator
   ├─ Tier 1  deterministic rules
   ├─ Tier 2  local keyword classifier
   └─ Tier 3  Qwen through Ollama, or a local template if Ollama is down
        │
 SQLite on this computer
```

Channels adapt input and display. They do not decide what a sale means. The agent replies with the same text regardless of channel. The gateway files that reply back onto the channel that asked.

External questions, such as a market price, are answered from a simulated sample only while the demo connection is **Online**. **Offline** stores them in a SQLite queue and answers them when you switch back. Recording a sale and reading it back stay local in both modes.

## Run it

Requirements: Node.js 22 or newer. npm comes with it. Ollama is optional.

```bash
git clone <repository>
cd fikaai
npm install
npm run dev
```

Open http://127.0.0.1:3000

Copy `.env.example` to `.env` only if you want to change a default. The app also starts with the defaults below.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Local port |
| `HOST` | `127.0.0.1` | Bind address |
| `DATABASE_PATH` | `./data/fikaai.sqlite` | SQLite file. Created on startup. |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Local Ollama |
| `OLLAMA_MODEL` | `qwen2.5:1.5b` | Model name passed to Ollama |
| `OLLAMA_ENABLED` | `true` | Set `false` to skip Ollama |
| `DEFAULT_USER_ID` | `demo-user` | Local demo user. No account system. |
| `CONNECTIVITY_MODE` | `online` | Starting position of the demo switch |

Node’s built-in `node:sqlite` may print one experimental warning. The database is still the local SQLite file.

## Optional Qwen

Tier 3 uses Ollama when it is running and the configured model is installed. Explanations still work without it: a local template summarizes the SQLite rows and labels itself `mock`.

```bash
# in another terminal, if the server is not already running
ollama serve
ollama pull qwen2.5:1.5b
```

Restart `npm run dev` after the model is present. The activity panel shows whether a reply came from `ollama` or `mock`.

## Try the demo

1. Web: `I sold three bags of maize for 4500.`
2. SMS: `How much did I sell today?`
3. USSD: `3` to view the same sale.
4. Web: `Explain what I recorded today.`
5. Switch to **Offline**, ask `What is the market price of maize?`, then switch to **Online**. The queued reply is a simulated sample, not a live price.

Kiswahili examples: `Nimeuza mifuko 3 ya mahindi kwa 4500`, `Nimeuza ngapi leo?`, `Eleza nilichorekodi leo`. The language control changes the page chrome and the USSD menu. A clearly English or Kiswahili message is answered in that language.

## Tests

```bash
npm test
```

The suite covers intent and routing, tool calls, offline queue and sync, web/SMS/USSD, record create/read/update/delete, and one HTTP path from each channel through the gateway to the agent.

## Cost and privacy

Development stays at KSh 0 of recurring infrastructure. There is no paid LLM, SMS, USSD, map, vector database, or cloud GPU dependency.

The demo stores a local user id, the messages you type, and the sales you record. It does not collect names, phone numbers, or other personal data. The SQLite file is local demo data. The market table is simulated sample data. A future production store would be a separate adapter, not this file.

Delete `data/fikaai.sqlite` to reset the file, or use **Clear demo data** in the Data tab.

## Layout

```text
src/server          HTTP API and static PWA
src/gateway         Channel-aware entry point
src/channels        Web, SMS simulator, USSD simulator
src/agent           Rules, local classifier, tools, orchestrator
src/llm             Ollama provider and local template
src/offline         Queue sync
src/storage         SQLite
src/i18n            English and Kiswahili strings
public              Web, SMS, and USSD screens
tests               Vitest
```

A later real SMS or USSD provider should implement the same `receive` / `send` channel shape and call the gateway. A later model should implement `generate(request)` the way `createOllamaProvider` and `createMockLlm` do.
