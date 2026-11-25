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

AI credentials are optional. Without them, deterministic fallback still extracts intent for common demos (for example maize yellowing in Kiambu).

---

1. **Open the application.**  
   Expect: **FikaAI** brand, tagline, demo notice, Online status.

2. **Enter:** `Maize leaf yellowing in Kiambu` → **Find guidance**.  
   Expect: search runs without crashing.

3. **Observe structured intent.**  
   Expect: intent panel showing crop `maize`, region `Kiambu` and a symptom (via AI or fallback).

4. **Review the results.**  
   Expect: ranked advisories, with the nitrogen-deficiency advisory near the top, each with **Demo data** badges.

5. **Open an advisory.**  
   Expect: advisory detail view.

6. **Review:**  
   - urgency and match strength  
   - field checks to confirm  
   - remediation and caution text  
   - last-updated timestamp  
   - synthetic/demo-data warning  
   Expect: all visible; no fabricated ratings or verified-by claims.

7. **Save to farm plan.**  
   Expect: Farm plan screen with protocol steps, plan title and sync status.

8. **Disable internet** (DevTools Offline or Wi‑Fi off).  
   Expect: Offline status/banner; app does not go blank.

9. **Confirm the saved plan remains available.**  
   Expect: plan steps still readable and tickable. Optional: **Save observation to device** → sync shows pending.

10. **Restore internet.**  
    Expect: Online status returns; sync messaging appears if actions were pending.

11. **Confirm synchronization.**  
    Expect: plan sync becomes **Synced** (or retry available if sync failed, without losing local data).

12. **Submit feedback.**  
    Expect: confirmation that feedback was saved.

13. **Try the phone channels.**  
    Open **SMS / USSD**, dial `*384*40#` in the simulator or send `Mahindi yangu yana wadudu Kiambu`. Expect a short reply in the matching language. Open `/cheatsheet.html` for the printable dial sheet.

---

### Optional safety check (30 seconds)

Enter: `My cow suddenly died in the shed`  
Expect: a hazard message that tells the user to keep away from the carcass and contact a veterinary or extension officer; no diagnosis.

### What judges should *not* expect

* Verified agronomic or veterinary advice
* Real extension-service, KALRO or agrovet partnerships
* Live weather, price or outbreak data
* Production telecom SMS/USSD delivery (the codes are demo codes)
