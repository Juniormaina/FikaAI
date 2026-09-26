# Hackathon demo checklist

Use this before recording or presenting.

## Environment

* [ ] Application starts successfully (`npm run dev` → http://127.0.0.1:3000)
* [ ] Database is seeded (`npm run seed` — expect providers present)
* [ ] AI provider works (ModelScope key configured and/or Ollama running) **or** fallback path confirmed
* [ ] AI fallback works (`LLM_PROVIDER=mock` or disconnect AI — search still returns cardiology results)
* [ ] No API secrets exposed (`.env` not committed; health endpoint shows no keys)
* [ ] Browser is ready (Chrome/Edge recommended for DevTools Offline)
* [ ] Network controls are accessible (DevTools → Network → Offline)

## Demo

* [ ] Enter natural-language request (`I need a cardiologist in Nairobi.`)
* [ ] AI intent appears/works (or fallback intent is shown clearly)
* [ ] Provider results appear with demo-data badges
* [ ] Facility selected
* [ ] Journey created
* [ ] Internet disabled
* [ ] Offline journey opens / remains visible
* [ ] Offline state visible (status pill + banner)
* [ ] Internet restored
* [ ] Sync occurs (pending → syncing → synced)
* [ ] Feedback submitted

## Safety

* [ ] Synthetic-data warning visible
* [ ] No diagnosis claims on screen
* [ ] Emergency handling works (`severe chest pain` → emergency message)
* [ ] No sensitive test data used

## Optional backup

* [ ] 30-second backup path rehearsed ([`BACKUP_DEMO.md`](BACKUP_DEMO.md))
* [ ] `LLM_PROVIDER=mock` ready if hosted AI is slow
