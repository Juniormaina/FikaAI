# FikaAI — Project description

**Word count target:** ~180 words

### What are you building?

FikaAI is a care-navigation prototype that helps people turn a natural-language healthcare need into structured search intent, discover synthetic demo provider options, save a lightweight healthcare journey, and keep that journey available when connectivity drops.

### Who is it for?

People who need to find appropriate care options under intermittent connectivity — for example, someone in Nairobi looking for a specialist without wanting to travel before understanding appointment or referral requirements.

### What problem does it solve?

Care navigation often fails in two places: uncertain facility requirements before travel, and loss of context when the network disappears mid-journey. FikaAI addresses that navigation gap; it does not diagnose conditions or claim live hospital availability.

### How does AI contribute?

AI (hosted Qwen via ModelScope, optional local Ollama, or deterministic fallback) extracts structured intent such as specialty and location. The application then queries a synthetic provider database. AI does not invent hospitals, doctors, or availability.

### Why does offline capability matter?

Connectivity can drop after a user has already found a facility. FikaAI caches the journey in IndexedDB, shows a clear Offline state, queues pending actions, and synchronizes when the connection returns.

### What makes the prototype technically interesting?

It separates AI understanding from factual provider data, combines a PWA/service worker with IndexedDB journey persistence, and demonstrates real sync-state transitions — while keeping SMS/USSD simulators as secondary channels.
