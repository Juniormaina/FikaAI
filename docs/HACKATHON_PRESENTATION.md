# FikaAI — 8-slide presentation content

Use as speaker notes / slide copy. Solo participant.

---

## Slide 1 — FikaAI

**FikaAI**

Healthcare access that works when connectivity doesn't.

* Care-navigation prototype  
* Participant: Junior Antony Maina
* Not a diagnosis system · Not live hospital availability

---

## Slide 2 — The Problem

* Uncertainty before travelling for specialist care
* Fragmented facility requirement information
* Intermittent connectivity breaks mid-journey context
* Unnecessary friction in care navigation

---

## Slide 3 — The Solution

```text
Ask
 ↓
Understand
 ↓
Discover
 ↓
Save
 ↓
Continue Offline
 ↓
Sync
```

FikaAI helps users express a need, discover options, save a journey, and continue when the network drops.

---

## Slide 4 — How AI Works

Natural language:

> “I need a cardiologist in Nairobi.”

becomes structured intent:

```json
{
  "specialty": "cardiology",
  "location": "Nairobi"
}
```

Then deterministic provider search returns stored records.

**Why this reduces hallucination risk:** the model extracts intent only; hospitals, availability, and requirements come from the provider dataset.

---

## Slide 5 — Offline-First Journey

```text
Online
 ↓
Provider selected
 ↓
Journey saved
 ↓
Offline
 ↓
Journey continues
 ↓
Connection restored
 ↓
Synchronization
```

IndexedDB + service worker keep the journey readable offline; pending actions sync on reconnect.

---

## Slide 6 — Technology

Actually used in this repo:

| Layer | Technology |
| --- | --- |
| Frontend | Vanilla JS PWA (`public/`) |
| Backend | Node.js + Express |
| Database | SQLite (`node:sqlite`) |
| AI | ModelScope (hosted Qwen 3.x), Ollama (`qwen2.5:3b`), mock + deterministic fallback |
| PWA | Web app manifest + service worker |
| Local storage | IndexedDB (journey cache) |
| Sync | Journey action queue + browser online/offline events |
| Tests | Vitest |
| Secondary | SMS / USSD simulators |

---

## Slide 7 — Responsible AI

* Synthetic provider data, clearly labeled
* No autonomous diagnosis
* AI for intent extraction only
* Provider records as source of truth
* Emergency-language safety message
* Minimal sensitive data collection
* Offline data kept on-device until sync

---

## Slide 8 — Demo / Future

### Current MVP

* NL search → structured intent → synthetic providers
* Facility requirements + demo-data warnings
* Journey save · offline continuity · reconnect sync · feedback

### Future development (not built yet)

* Real provider integrations / verified availability
* Production SMS/USSD adapters
* Broader provider network coverage
* Deeper healthcare workflows beyond navigation

**Close:** FikaAI — healthcare access that works when connectivity doesn't.
