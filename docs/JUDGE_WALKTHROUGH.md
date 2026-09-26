# Judge walkthrough (2–3 minutes)

How to verify FikaAI quickly using the actual product.

## Setup

```bash
cp .env.example .env
npm install
npm run seed
npm run dev
```

Open http://127.0.0.1:3000

AI credentials are optional. Without them, deterministic fallback still extracts intent for common demos (for example cardiology in Nairobi).

---

1. **Open the application.**  
   Expect: **FikaAI** brand, tagline, privacy/demo notice, Online status.

2. **Enter:** `I need a cardiologist in Nairobi.` → **Find care**.  
   Expect: search runs without crashing.

3. **Observe structured intent.**  
   Expect: intent panel showing specialty `cardiology`, location `Nairobi` (via AI or fallback).

4. **Review provider results.**  
   Expect: one or more Nairobi cardiology demo facilities with **Demo data** badges.

5. **Open a facility.**  
   Expect: facility detail view.

6. **Review:**  
   - availability status/note  
   - appointment requirement  
   - referral requirement  
   - last-updated timestamp  
   - synthetic/demo-data warning  
   Expect: all visible; no fabricated ratings.

7. **Start the healthcare journey.**  
   Expect: Journey screen with checklist, facility name, connection + sync status.

8. **Disable internet** (DevTools Offline or Wi‑Fi off).  
   Expect: Offline status/banner; app does not go blank.

9. **Confirm the saved journey remains available.**  
   Expect: facility snapshot and journey steps still readable. Optional: **Save offline note** → sync shows pending.

10. **Restore internet.**  
    Expect: Online status returns; sync messaging appears if actions were pending.

11. **Confirm synchronization.**  
    Expect: journey sync becomes **Synced** (or retry available if sync failed without losing local journey).

12. **Submit feedback.**  
    Expect: Yes / Partly / No available after sync; confirmation that feedback was saved.

---

### Optional safety check (30 seconds)

Enter: `I have severe chest pain and difficulty breathing`  
Expect: emergency-oriented message; no diagnosis; no provider invention.

### What judges should *not* expect

* Live verified hospital availability
* Real hospital partnerships
* Medical diagnosis
* Production telecom SMS/USSD delivery
