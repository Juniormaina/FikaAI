# FikaAI — Hackathon submission README

## Team Auras

| Field | Value |
| --- | --- |
| Team name | Auras |
| Participant | Junior Antony Maina |
| Email | zangiffk@gmail.com |
| Country | Kenya |
| Participation | Online |
| Project | FikaAI |
| Tagline | Healthcare access that works when connectivity doesn't. |

## What is in this folder

| File | Description |
| --- | --- |
| `FikaAI_GOMYCODE_Demo.mp4` | ~90s narrated product demo |
| `FikaAI_GOMYCODE_Presentation.pptx` | 8-slide presentation |
| `FikaAI_AI_TOOL_DISCLOSURE.md` | Transparent AI/tool/dataset disclosure |
| `FikaAI_FINAL_REVIEW.md` | Reviewer-style final audit |
| `DEMO_SCRIPT.md` | Spoken demo script |
| `HACKATHON_README.md` | This file |

## Run the prototype

From the repository root:

```bash
cp .env.example .env
npm install
npm run seed
npm run dev
```

Open http://127.0.0.1:3000

AI credentials are optional. Deterministic fallback keeps the cardiology demo usable without ModelScope/Ollama.

## Important honesty notes

- Provider records are **synthetic demonstration data**
- FikaAI is **not** a diagnosis system
- No external healthcare provider API is integrated
- SMS/USSD are **simulators** (secondary)
- NVIDIA Brev was **not** used

## Full project docs

See the repository root `README.md` and `docs/` for walkthroughs, test report, and backup demo notes.
