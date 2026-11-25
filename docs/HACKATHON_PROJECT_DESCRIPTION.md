# FikaAI — Project description

**Word count target:** ~180 words

### What are you building?

FikaAI is a farm-advisory prototype that helps people turn a natural-language crop or livestock question into structured search intent, review ranked guidance from a synthetic advisory library, save a farm plan, and keep that plan available when connectivity drops.

### Who is it for?

Smallholders, field extension officers and cooperatives working under intermittent connectivity, for example a maize farmer in Kiambu who needs to know what to check before applying fertiliser.

### What problem does it solve?

Field advice often fails in two places: it needs a connection that is not there, and the context is lost when the network drops mid-task. FikaAI addresses that gap. It does not replace a certified agronomist or veterinarian, and it does not present synthetic data as verified advice.

### How does AI contribute?

AI (hosted Qwen via ModelScope, optional local Ollama, or deterministic fallback) extracts structured intent such as crop, region and symptom. The application then ranks stored advisories. AI does not invent products, rates or diagnoses.

### Why does offline capability matter?

Connectivity can drop after a user has already found guidance. FikaAI caches the plan in IndexedDB, shows a clear Offline state, queues pending observations, and synchronizes when the connection returns. SMS and USSD simulators show the same guidance reaching basic phones.

### What makes the prototype technically interesting?

It separates AI understanding from stored advisory content, combines a PWA and service worker with IndexedDB plan persistence, demonstrates real sync-state transitions, and serves the same guidance over web, SMS and USSD.
