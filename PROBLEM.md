# The Problem

People who need healthcare often face unreliable connectivity. A patient may travel across a city for specialist care only to discover that an appointment or referral is required — or that the provider cannot see them that day.

The access problem is not only “finding a hospital name.” It is navigating care requirements with incomplete information, then losing that context when the network drops.

## Who Experiences It?

People in intermittent-connectivity settings who need to:

* discover an appropriate facility or specialty
* understand appointment and referral requirements before travelling
* keep a care plan available when Wi‑Fi or mobile data disappears
* resume and sync when connectivity returns

This prototype treats those conditions as a design constraint. It does not invent population statistics.

## Why Does It Matter Now?

Mobile AI assistants are becoming more capable, but many healthcare-adjacent tools still assume continuous connectivity and rich apps. When the network fails, the user’s progress disappears with it.

FikaAI explores whether care navigation can remain useful offline — without pretending to diagnose patients or to provide live verified hospital availability.

## What Are We Trying to Change?

> **Healthcare access that works when connectivity doesn't.**

FikaAI’s MVP demonstrates:

* natural-language intent extraction for care discovery
* deterministic provider search over synthetic demo data
* a lightweight patient journey
* offline persistence and reconnection sync
* responsible limits (no diagnosis, no invented facilities, emergency-language redirect)

## MVP Scope

* Care-first PWA
* AI intent extraction with ModelScope / Ollama / deterministic fallback
* Synthetic Nairobi-focused provider directory in SQLite
* Journey + IndexedDB offline continuity
* Sync state machine (`pending` → `syncing` → `synced` / `failed`)
* Feedback
* SMS / USSD simulators retained as secondary channels

## What This Is Not

* a medical diagnosis system
* a replacement for clinicians
* a live national provider network
* verified real-time hospital availability
* a clinical decision-support system
