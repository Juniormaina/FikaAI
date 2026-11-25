# Demo recording plan (~90 seconds)

Record at 1080p. Prefer Chrome with DevTools docked (Network → Offline toggle visible). Most important visual: **Internet OFF → saved farm plan still works.**

---

### Shot 1

```text
TIME: 0:00–0:10
SCREEN: Home / Find care
ACTION: Show brand + tagline; do not click yet
WHAT TO SAY: “Imagine your maize turning yellow far from signal, with the top-dressing window closing.”
EXPECTED RESULT: FikaAI branding and tagline clearly readable
```

### Shot 2

```text
TIME: 0:10–0:25
SCREEN: Find care
ACTION: Enter “Maize leaf yellowing in Kiambu” → Find guidance
WHAT TO SAY: “FikaAI uses AI to turn natural language into structured search intent.”
EXPECTED RESULT: Intent panel shows maize / Kiambu
```

### Shot 3

```text
TIME: 0:25–0:40
SCREEN: Results (+ brief advisory detail if needed)
ACTION: Scroll cards; highlight demo badge, specialist, appointment/referral, last updated
WHAT TO SAY: “Guidance comes from the synthetic advisory library — not AI inventing advice.”
EXPECTED RESULT: Demo-data labels visible on results
```

### Shot 4

```text
TIME: 0:40–0:55
SCREEN: Advisory → Farm plan
ACTION: Open advisory → Save to farm plan (offline)
WHAT TO SAY: “The farmer saves a farm plan with the checklist stored on the device.”
EXPECTED RESULT: Farm plan checklist + plan title + sync status Synced
```

### Shot 5 — KEY MOMENT

```text
TIME: 0:55–1:10
SCREEN: Farm plan + Offline indicator
ACTION: Toggle DevTools Offline (or Wi‑Fi off); stay on Farm plan; optional Save observation to device
WHAT TO SAY: “Now the connection is gone, but the saved farm plan is still available.”
EXPECTED RESULT: Offline pill/banner; plan content still visible (not a blank screen)
```

### Shot 6

```text
TIME: 1:10–1:22
SCREEN: Farm plan sync UI
ACTION: Restore Online
WHAT TO SAY: “When connectivity returns, pending actions synchronize.”
EXPECTED RESULT: Connection restored / Synchronizing… / Synced (if a pending note exists)
```

### Shot 7

```text
TIME: 1:22–1:30
SCREEN: Branding close / feedback optional
ACTION: Hold on FikaAI header; optional Yes feedback
WHAT TO SAY: “FikaAI — farming guidance that works when signal doesn't.”
EXPECTED RESULT: Clear closing brand moment
```

---

## Recording tips

* Seed and warm the page once before recording
* Prefer fallback-ready mode if ModelScope latency is high (`LLM_PROVIDER=mock` still demos intent via fallback)
* Keep DevTools Offline toggle in frame for Shot 5 credibility
* If AI is slow, still proceed — fallback keeps the story intact
