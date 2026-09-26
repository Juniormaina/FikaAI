# Test report

**Date of recorded automated run:** 26 Sep 2026  
**Command:** `npm test`  
**Result:** **40 passed / 40 total** (7 files)

Suites: `healthcare`, `agent`, `channels`, `offline`, `data`, `llm-provider`, `e2e`.

Only tests that were executed successfully are marked **PASS**. Items requiring live browser network toggling are marked accordingly.

## Functional tests

| Test | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Natural-language search / intent | Specialty/location extracted | **PASS** | `tests/healthcare.test.js` fallback + API search |
| Provider search | Results returned | **PASS** | Care API search returns cardiology providers |
| Facility selection / detail | Provider detail available | **PASS** | `GET /api/care/providers/:id` in healthcare suite |
| Journey creation | Journey saved | **PASS** | `POST /api/care/journeys` → 201 |
| Offline mode (API/demo backend) | Search still works via fallback | **PASS** | Offline connectivity mode healthcare test |
| Offline mode (browser journey UI) | Journey remains accessible | **MANUAL / DEMO** | Implemented via IndexedDB + offline UI; verify in browser DevTools Offline |
| Reconnection / sync | Pending → synced | **PASS** | Journey action + sync API test |
| Feedback | Feedback stored | **PASS** | `POST /api/care/feedback` + repo list |

## Reliability tests

| Test | Expected | Result | Evidence |
| --- | --- | --- | --- |
| AI unavailable | Fallback intent still works | **PASS** | `extractHealthcareIntent` with throwing LLM |
| Malformed AI output | Rejected safely; fallback used | **PASS** | `parseIntentJson` malformed cases |
| Mock / non-intent LLM text | Fallback specialty/location | **PASS** | Mock LLM healthcare test |
| Emergency language | Safety message; no diagnosis | **PASS** | Safety unit + API emergency kind |
| No provider results path | Empty-state messaging supported | **IMPLEMENTED** | API returns `kind: empty`; covered by product logic (not a dedicated empty-query assert) |
| Offline backend search | Results via fallback | **PASS** | Offline connectivity healthcare test |
| Sync failure handling | Journey retained; failed/retry UI | **IMPLEMENTED** | Client sets `failed` + Retry; automated suite covers successful sync path |

## Legacy / supporting suites (also PASS)

* Agent rules/tools path
* SMS / USSD channel adapters
* Offline queue sync for secondary channel external-info flow
* LLM provider routing (including ModelScope key redaction in status)
* HTTP e2e channel path

## Seed reproducibility

```bash
npm run seed
```

Verified: 10 synthetic providers present in SQLite (`seeded: false, count: 10` when already populated).

## Secrets check

* `.env` is gitignored
* `.env.example` uses empty `MODELSCOPE_API_KEY=`
* Health/status endpoints expose configuration booleans, not secret values
