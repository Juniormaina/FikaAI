# AI / tool disclosure

Documented from the actual FikaAI repository and development session. Only tools known to be used are listed.

## AI used in the product

| Tool/Model | Purpose | Where Used |
| --- | --- | --- |
| ModelScope hosted Qwen 3.x (default `Qwen-Ambassador/Qwen3.7-Max`; allowlist also includes Qwen3.8-Max / Plus variants) | Structured healthcare intent extraction from natural language | Product — `src/llm/modelscope.js`, care search API |
| Ollama `qwen2.5:3b` | Local/offline-capable LLM path for intent extraction when available | Product — `src/llm/provider.js` |
| Deterministic keyword intent fallback | Intent extraction when LLM unavailable or returns invalid output | Product — `src/healthcare/intent.js` |
| Mock LLM template | Last-resort provider in router / tests | Product + tests — `src/llm/provider.js` |

> AI in the product is used for intent understanding. It does not diagnose patients or invent provider availability.

## AI used during development

| Tool/Model | Purpose | Where Used |
| --- | --- | --- |
| Cursor (Composer / Auto agent) | Coding assistance, implementation, tests, documentation | Development |

## Non-AI tools used

| Tool | Purpose | Where Used |
| --- | --- | --- |
| Node.js 22+ | Runtime | Development / runtime |
| Express | HTTP API | Product |
| Vitest | Automated tests | Development |
| SQLite (`node:sqlite`) | Local persistence | Product |
| IndexedDB / Service Worker | Offline PWA cache | Product (browser) |
| npm | Package management | Development |

## Notes

* Hosted ModelScope requires a local `MODELSCOPE_API_KEY` in `.env` (never committed).
* The core demo remains usable without hosted AI via the deterministic fallback.
* SMS/USSD channels retain the earlier local agent path; the primary care demo uses the healthcare intent layer above.
