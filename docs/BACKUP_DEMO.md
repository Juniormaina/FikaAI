# Backup demo (~30 seconds)

Use if the full 90-second recording fails, AI is slow, or sync UI misbehaves. Prefer **no dependence on hosted AI**.

## Prep (once)

```bash
LLM_PROVIDER=mock npm run dev
# or keep auto; fallback still works for the maize example
```

Open http://127.0.0.1:3000  
Confirm seed: `npm run seed`

## 30-second sequence

1. **Natural-language search** (0–8s)  
   Enter: `Maize leaf yellowing in Kiambu` → Find guidance  
   Expect: intent (fallback is fine) + results

2. **Guidance results** (8–14s)  
   Point to the demo badge, urgency and field checks

3. **Save a plan** (14–20s)  
   Open the top advisory → Save to farm plan (offline)

4. **Saved plan** (20–24s)  
   Show the step checklist + plan title

5. **Offline mode** (24–30s)  
   DevTools Offline → show Offline status + plan still visible  
   Close: “Farming guidance that works when signal doesn't.”

## Avoid in backup

* Waiting on ModelScope latency
* Long feedback explanation
* Claims about verified advice or live extension services

## If even seed fails

```bash
node scripts/seed.js --force
npm test
```

Then retry the backup sequence.
