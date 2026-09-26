# FikaAI — Final reviewer audit

**Team:** Auras  
**Participant:** Junior Antony Maina  
**Email:** zangiffk@gmail.com  
**Country:** Kenya  
**Participation:** Online  
**Project:** FikaAI  
**Tagline:** Healthcare access that works when connectivity doesn't.

Audit date: 27 Sep 2026 (local)

---

## Video

| Check | Result | Notes |
| --- | --- | --- |
| MP4 opens | **PASS** | `hackathon-deliverables/FikaAI_GOMYCODE_Demo.mp4` |
| Approximately 90 seconds | **PASS** | ffprobe duration **90.0s** |
| Audio works | **PASS** | AAC audio stream present; Edge TTS `en-KE-AsiliaNeural` |
| Narration understandable | **PASS** | Script matches product claims; moderate pace |
| Actual application shown | **PASS** | Screenshots from running http://127.0.0.1:3000 |
| Offline behavior demonstrated | **PASS*** | App Offline UI + pending note + sync shown |
| No secrets visible | **PASS** | No API keys/tokens in frames |
| No unsupported claims | **PASS** | Synthetic data labeled; future work framed as next |
| Problem / product / proof / next | **PASS** | Structure follows brief |

\*Offline capture used the application’s real `offline`/`online` event handlers (same path as browser network offline). Physical Wi‑Fi cut was not performed in the automated recording environment; sync/pending state transitions were exercised against the live local API.

---

## PowerPoint

| Check | Result |
| --- | --- |
| PPTX opens | **PASS** (`FikaAI_GOMYCODE_Presentation.pptx`, 8 slides) |
| Team name Auras | **PASS** |
| Email zangiffk@gmail.com | **PASS** |
| Country Kenya | **PASS** |
| Participation Online | **PASS** |
| FikaAI clearly identified | **PASS** |
| AI contribution explained | **PASS** (Slide 4) |
| Responsible AI explained | **PASS** (Slide 7) |
| MVP vs future distinguished | **PASS** (Slide 8) |

---

## Disclosure

| Check | Result |
| --- | --- |
| Models listed | **PASS** |
| Agents listed | **PASS** |
| Tools listed | **PASS** |
| Datasets listed | **PASS** (synthetic) |
| APIs listed | **PASS** |
| Generated assets listed | **PASS** |
| Fallback explained | **PASS** |
| Access constraints explained | **PASS** |
| NVIDIA Brev status | **NOT USED** |
| No credentials / keys / vouchers | **PASS** |

---

## Consistency check (Video ↔ Presentation ↔ README ↔ App)

| Claim | App | Docs/Video |
| --- | --- | --- |
| NL → structured intent → provider DB | Yes | Yes |
| Synthetic/demo provider data | Yes | Yes |
| Journey save + offline continuity | Yes | Yes |
| Sync pending → synced | Yes | Yes |
| No diagnosis | Yes | Yes |
| No live hospital API | Yes | Yes |
| SMS/USSD primary demo | No (secondary) | Correctly secondary |

---

## Application verification (this package)

| Check | Result |
| --- | --- |
| `npm test` | **PASS** (40/40) |
| Core journey (API + UI capture) | **PASS** |
| AI / fallback | **PASS** |
| Offline UI path | **PASS** |
| Synchronization | **PASS** |
| Safety emergency path (tests) | **PASS** |
| No secrets in deliverables folder | **PASS** |

---

## External video link

```text
VIDEO LINK STATUS:
Not published automatically because no verified external video-hosting capability was available.

LOCAL VIDEO:
hackathon-deliverables/FikaAI_GOMYCODE_Demo.mp4
```

External link tested outside creator account: **NOT AVAILABLE**

---

## Final status

**READY FOR SUBMISSION** (local package complete).

Remaining optional human step: upload the MP4 to the organizer’s required video host and paste the public reviewer URL into the submission form.
