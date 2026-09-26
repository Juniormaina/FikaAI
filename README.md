# FikaAI

> **Healthcare access that works when connectivity doesn't.**

A healthcare-access and care-navigation prototype designed to help users discover appropriate provider options and maintain their journey when connectivity is unreliable.

This is **not** a medical diagnosis system, a replacement for doctors, a live national healthcare network, or a clinical decision tool.

## Problem

In many places, people need specialist care but cannot assume continuous connectivity. Travelling across a city only to discover that a referral is required — or that a provider cannot see them — wastes time, money, and trust.

## Solution

FikaAI helps a patient:

1. Describe a healthcare need in natural language
2. Extract structured search intent with AI (or a deterministic fallback)
3. Discover **synthetic demo providers** from a local directory
4. Start a lightweight healthcare journey
5. Keep that journey available offline
6. Synchronize pending actions when connectivity returns
7. Leave simple feedback

## MVP

* AI intent extraction (ModelScope / Ollama / fallback)
* Provider discovery from synthetic SQLite data
* Facility detail with appointment/referral requirements
* Healthcare journey persistence
* Offline continuity (service worker + IndexedDB)
* Reconnection detection and sync state transitions
* Feedback capture
* Emergency-language safety message (no diagnosis)
* SMS / USSD simulators retained as secondary channels

## Architecture

```text
Patient
   ↓
FikaAI PWA
   ↓
AI Intent Layer (Qwen via ModelScope / Ollama / deterministic fallback)
   ↓
Provider Search API
   ↓
SQLite / Synthetic Provider Dataset
   ↓
Healthcare Journey
   ↓
IndexedDB (offline cache)
   ↕
Sync on reconnect
```

AI extracts intent only. Availability and facility facts come from the database — never from the model.

## AI

| Role | Detail |
| --- | --- |
| What AI does | Natural-language understanding → structured intent JSON |
| Providers | ModelScope (hosted Qwen 3.x), Ollama (`qwen2.5:3b`), mock |
| Fallback | Deterministic keyword/intent mapping if AI is unavailable |
| What AI does **not** do | Invent hospitals, doctors, availability, diagnoses, or medicines |

Example intent:

```json
{
  "specialty": "cardiology",
  "location": "Nairobi",
  "request_type": "specialist_consultation",
  "urgency": "routine",
  "confidence": 0.92
}
```

## Data

> Provider information in this prototype is **synthetic demonstration data** and is not verified live healthcare availability.

Every provider record is marked demo/synthetic and includes a last-updated timestamp (`27 Sep 2026, 09:30 EAT`).

## Responsible AI

* No autonomous diagnosis
* No fabricated live hospital partnerships
* Emergency language triggers a redirect-to-care message, not a clinical assessment
* Minimal data collection — do not enter sensitive medical information
* Offline journey state stays on-device (IndexedDB) until sync

## Running locally

Requirements: Node.js 22+.

```bash
cp .env.example .env
npm install
npm run seed
npm run dev
```

Open http://127.0.0.1:3000

Optional AI:

```bash
# Local
ollama serve && ollama pull qwen2.5:3b

# Hosted (set MODELSCOPE_API_KEY in .env — never commit it)
npm run smoke:modelscope
```

### Seed

```bash
npm run seed
# force re-seed:
node scripts/seed.js --force
```

### Tests

```bash
npm test
```

## 90-second demo flow

1. Open FikaAI
2. Enter: `I need a cardiologist in Nairobi.`
3. Show structured intent + provider results (demo data badges)
4. Open a facility → appointment / referral / last updated
5. **Start healthcare journey**
6. Turn off Wi‑Fi / DevTools offline
7. Journey remains available · UI shows **Offline**
8. Tap **Save offline note** (pending)
9. Restore connectivity → syncing → **Synced**
10. Submit feedback
11. Close with: **FikaAI — healthcare access that works when connectivity doesn't.**

## Environment variables

See `.env.example`. Important:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Local port |
| `DATABASE_PATH` | `./data/fikaai.sqlite` | SQLite file |
| `OLLAMA_*` | local defaults | Optional local Qwen |
| `MODELSCOPE_API_KEY` | empty | Optional hosted Qwen |
| `LLM_PROVIDER` | `auto` | `auto` \| `ollama` \| `modelscope` \| `mock` |
| `CONNECTIVITY_MODE` | `online` | Demo backend ONLINE/OFFLINE |

**Never commit `.env` or API keys.**

## Layout

```text
src/healthcare     Intent, safety, synthetic providers, care flow
src/server         HTTP API + static PWA
src/llm            ModelScope / Ollama / mock router
src/storage        SQLite schema + repository
src/offline        Legacy channel queue sync
src/channels       SMS / USSD simulators (secondary)
public             Care-first PWA (IndexedDB + service worker)
scripts/seed.js    Demo provider seeding
tests              Vitest (including healthcare journey)
```

## Legacy channel agent

The original multi-channel sales-agent path (Web chat tools, SMS, USSD, offline queue) remains available under the **SMS / USSD** tab for secondary demos. The primary vertical slice is **Find care → Journey**.
