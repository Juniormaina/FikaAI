# FikaAI — Transparent AI / Tool Disclosure

## Project

FikaAI

## Team

Auras

## Participant

Junior Antony Maina

## Country

Kenya

## Participation

Online

## Contact

zangiffk@gmail.com

---

## AI used in the product

| Model/Tool | Purpose | Actual contribution | Where | Input | Output | Limitations | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ModelScope hosted Qwen 3.x (default `Qwen-Ambassador/Qwen3.7-Max`) | Intent extraction | Converts natural-language care requests into structured search intent JSON | Care search API (`/api/care/search`) via `src/llm/modelscope.js` | User text + intent system prompt | Specialty / location / request_type / urgency / confidence | Requires API key; network; may return malformed JSON; does not provide facility facts | Deterministic keyword intent mapping |
| Ollama `qwen2.5:3b` | Local intent extraction when available | Same structured-intent role as above | `src/llm/provider.js` | Same | Same | Requires local Ollama + model pull | Deterministic fallback / mock |
| Deterministic keyword intent fallback | Keep demo usable without AI | Maps phrases like “cardiologist in Nairobi” to specialty/location | `src/healthcare/intent.js` | User text | Structured intent with confidence | Keyword coverage is limited | N/A (this *is* the fallback) |
| Mock LLM template | Last-resort router provider / tests | Non-intent template text; triggers fallback for care search | `src/llm/provider.js` | Prompt | Template chat/explain text | Not used as medical/provider source of truth | Keyword fallback for care |

> AI is used for intent understanding, not autonomous medical diagnosis or generation of provider availability.

---

## AI used to build the product

| Tool | Purpose | How it contributed | Review | Limitations |
| --- | --- | --- | --- | --- |
| Cursor (Composer / Auto agent) | Coding assistance | Helped implement healthcare vertical slice, tests, docs, and submission packaging | Human review of diffs, tests (`npm test`), and demo flow required | Can hallucinate; must be verified against repo |
| Microsoft Edge TTS (`en-KE-AsiliaNeural`) | Demo video narration | Generated spoken narration for `FikaAI_GOMYCODE_Demo.mp4` | Script reviewed for unsupported claims | Synthetic voice; not a live speaker recording |

---

## Datasets

> FikaAI uses synthetic provider records created for the demonstration. They are not verified live healthcare availability.

- Source: `src/healthcare/providers-data.js` seeded into SQLite via `npm run seed`
- Count: 10 synthetic facilities (Nairobi-focused, plus sample Mombasa/Kisumu entries)
- No external healthcare dataset or hospital partnership data was imported

---

## APIs

| API | Purpose | Required for demo? | Live vs synthetic | Limitations |
| --- | --- | --- | --- | --- |
| ModelScope OpenAI-compatible inference API | Optional hosted Qwen intent extraction | No (fallback works) | Live model responses for intent only | Needs `MODELSCOPE_API_KEY` in local `.env`; never committed |
| Ollama local HTTP API | Optional local Qwen | No | Local | Requires Ollama running |

> No external healthcare provider API was used in this prototype.

---

## Generated assets

| Asset | Purpose |
| --- | --- |
| Edge TTS narration MP3 | Voiceover for demo video |
| UI screenshots from running FikaAI | Video frames + PowerPoint screenshots |
| Title / end cards (Pillow-generated) | Video open/close branding |
| `FikaAI_GOMYCODE_Demo.mp4` | 90-second narrated submission video |
| `FikaAI_GOMYCODE_Presentation.pptx` | 8-slide submission deck |
| AI-assisted documentation in `docs/` and this package | Submission materials |

No AI-generated hospital logos, fake testimonials, or fabricated metrics were used.

---

## NVIDIA Brev

> NVIDIA Brev was not used in this project.

---

## Access constraints

- Solo developer on a local laptop
- Hosted ModelScope optional and network-dependent
- Local Ollama optional and model-size dependent
- Offline demo must work without relying on hosted AI
- No production telecom SMS/USSD credentials

**How handled:** provider facts stay in local SQLite; AI has deterministic fallback; journey cached in IndexedDB; SMS/USSD remain simulators.

---

## Fallback disclosure

```text
AI available
    ↓
AI extracts structured intent
    ↓
Validated structured query
    ↓
Provider database results

AI unavailable / malformed output
    ↓
Deterministic keyword intent handling
    ↓
Application remains usable
```

Emergency-language requests short-circuit to a safety message (no diagnosis, no provider invention).

---

## Secrets policy

- `.env` is gitignored
- API keys are never placed in this disclosure package
- Health endpoints expose configuration booleans only, not secrets
