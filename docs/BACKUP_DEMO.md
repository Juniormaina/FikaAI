# Backup demo (~30 seconds)

Use if the full 90-second recording fails, AI is slow, or sync UI misbehaves. Prefer **no dependence on hosted AI**.

## Prep (once)

```bash
LLM_PROVIDER=mock npm run dev
# or keep auto; fallback still works for the cardiology example
```

Open http://127.0.0.1:3000  
Confirm seed: `npm run seed`

## 30-second sequence

1. **Natural-language search** (0–8s)  
   Enter: `I need a cardiologist in Nairobi.` → Find care  
   Expect: intent (fallback is fine) + results

2. **Provider results** (8–14s)  
   Point to demo badge + appointment/referral fields

3. **Facility selection** (14–20s)  
   View facility → Start healthcare journey

4. **Saved journey** (20–24s)  
   Show journey checklist + facility name

5. **Offline mode** (24–30s)  
   DevTools Offline → show Offline status + journey still visible  
   Close: “Healthcare access that works when connectivity doesn't.”

## Avoid in backup

* Waiting on ModelScope latency
* SMS/USSD tabs
* Long feedback explanation
* Claims about live hospitals

## If even seed fails

```bash
node scripts/seed.js --force
npm test
```

Then retry the backup sequence.
