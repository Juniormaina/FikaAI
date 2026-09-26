# Demo recording plan (~90 seconds)

Record at 1080p. Prefer Chrome with DevTools docked (Network → Offline toggle visible). Most important visual: **Internet OFF → saved journey still works.**

---

### Shot 1

```text
TIME: 0:00–0:10
SCREEN: Home / Find care
ACTION: Show brand + tagline; do not click yet
WHAT TO SAY: “Imagine needing a specialist in Nairobi but not knowing whether the facility can help you before you make the trip.”
EXPECTED RESULT: FikaAI branding and tagline clearly readable
```

### Shot 2

```text
TIME: 0:10–0:25
SCREEN: Find care
ACTION: Enter “I need a cardiologist in Nairobi.” → Find care
WHAT TO SAY: “FikaAI uses AI to turn natural language into structured healthcare-search intent.”
EXPECTED RESULT: Intent panel shows cardiology / Nairobi
```

### Shot 3

```text
TIME: 0:25–0:40
SCREEN: Results (+ brief facility detail if needed)
ACTION: Scroll cards; highlight demo badge, specialist, appointment/referral, last updated
WHAT TO SAY: “Provider facts come from the synthetic dataset — not AI inventing hospitals.”
EXPECTED RESULT: Demo-data labels visible on results
```

### Shot 4

```text
TIME: 0:40–0:55
SCREEN: Facility → Journey
ACTION: View facility → Start healthcare journey
WHAT TO SAY: “The patient starts a healthcare journey with requirements saved.”
EXPECTED RESULT: Journey checklist + facility name + sync status Synced
```

### Shot 5 — KEY MOMENT

```text
TIME: 0:55–1:10
SCREEN: Journey + Offline indicator
ACTION: Toggle DevTools Offline (or Wi‑Fi off); stay on Journey; optional Save offline note
WHAT TO SAY: “Now the connection is gone, but the patient's saved journey is still available.”
EXPECTED RESULT: Offline pill/banner; journey content still visible (not a blank screen)
```

### Shot 6

```text
TIME: 1:10–1:22
SCREEN: Journey sync UI
ACTION: Restore Online
WHAT TO SAY: “When connectivity returns, pending actions synchronize.”
EXPECTED RESULT: Connection restored / Synchronizing… / Synced (if a pending note exists)
```

### Shot 7

```text
TIME: 1:22–1:30
SCREEN: Branding close / feedback optional
ACTION: Hold on FikaAI header; optional Yes feedback
WHAT TO SAY: “FikaAI — healthcare access that works when connectivity doesn't.”
EXPECTED RESULT: Clear closing brand moment
```

---

## Recording tips

* Seed and warm the page once before recording
* Prefer fallback-ready mode if ModelScope latency is high (`LLM_PROVIDER=mock` still demos intent via fallback)
* Keep DevTools Offline toggle in frame for Shot 5 credibility
* If AI is slow, still proceed — fallback keeps the story intact
