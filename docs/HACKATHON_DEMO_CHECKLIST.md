# Hackathon demo checklist

Use this before recording or presenting.

## Environment

* [ ] Application starts successfully (`npm run dev` → http://127.0.0.1:3000)
* [ ] Database is seeded (`npm run seed` — expect advisories present)
* [ ] AI provider works (ModelScope key configured and/or Ollama running) **or** fallback path confirmed
* [ ] AI fallback works (`LLM_PROVIDER=mock` or disconnect AI — search still returns maize guidance)
* [ ] No API secrets exposed (`.env` not committed; /api/health shows no keys)
* [ ] Browser is ready (Chrome/Edge recommended for DevTools Offline)
* [ ] Network controls are accessible (DevTools → Network → Offline)

## Demo

* [ ] Enter natural-language question (`Maize leaf yellowing in Kiambu`)
* [ ] AI intent appears/works (or fallback intent is shown clearly)
* [ ] Ranked advisories appear with demo-data badges
* [ ] Advisory opened
* [ ] Farm plan saved
* [ ] Internet disabled
* [ ] Offline plan opens / remains visible
* [ ] Offline state visible (status pill + banner)
* [ ] Internet restored
* [ ] Sync occurs (pending → syncing → synced)
* [ ] Feedback submitted

## Safety

* [ ] Synthetic-data warning visible
* [ ] No diagnosis or verified-advice claims on screen
* [ ] Hazard handling works (`My cow suddenly died in the shed` → hazard message)
* [ ] No sensitive test data used

## Optional backup

* [ ] 30-second backup path rehearsed ([`BACKUP_DEMO.md`](BACKUP_DEMO.md))
* [ ] `LLM_PROVIDER=mock` ready if hosted AI is slow
