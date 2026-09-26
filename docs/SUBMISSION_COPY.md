# Submission copy

Polished field-ready text grounded in the implemented FikaAI prototype.

---

### Project Name

FikaAI

### Tagline

Healthcare access that works when connectivity doesn't.

### Short Description (~50 words)

FikaAI is a care-navigation prototype that turns a natural-language healthcare need into structured search intent, shows synthetic provider options with clear requirements, and keeps a patient journey available offline — then synchronizes when connectivity returns. It is not a diagnosis system and does not claim live hospital availability.

### Full Description (~180 words)

FikaAI helps people navigate healthcare access when connectivity is unreliable. A user describes a need in plain language — for example, needing a cardiologist in Nairobi. AI extracts structured search intent; the application then queries a synthetic provider directory for matching facilities, specialists, appointment and referral requirements, and last-updated timestamps clearly marked as demo data.

The user can start a lightweight healthcare journey that stores the selected facility snapshot. If the network drops, the journey remains available through the PWA’s offline cache. Pending actions synchronize when connectivity returns, and the user can submit simple feedback.

Technically, FikaAI combines an Express/SQLite backend, a vanilla JS PWA with service worker and IndexedDB, and an AI provider abstraction for ModelScope-hosted Qwen, optional local Ollama, and deterministic fallback. AI is used for intent understanding only — not medical diagnosis or invented availability.

### Problem (~120 words)

Accessing specialist care often requires travelling before confirming whether a facility can help, whether an appointment is needed, or whether a referral is required. When mobile connectivity is intermittent, even partial answers are easy to lose. The result is wasted trips, delayed care, and avoidable friction — especially for people who cannot assume continuous internet, expensive data, or rich installed apps. FikaAI focuses on this care-navigation gap: helping users understand options and keep a journey intact across connectivity changes, without claiming to diagnose conditions or to present verified live hospital status.

### Solution (~120 words)

FikaAI provides a mobile-first web experience where users ask for care in natural language, review synthetic provider options with requirements and demo-data labels, and start a saved healthcare journey. Offline, the application shows a clear Offline state and keeps the journey readable from on-device storage. When the connection returns, pending updates synchronize. Optional SMS/USSD simulators remain available as secondary channels. The prototype is designed to be demonstrable end-to-end on a laptop with local SQLite data and optional AI providers.

### AI Contribution (~100 words)

AI contributes natural-language understanding. Hosted Qwen models via ModelScope (and optionally local Ollama) convert a user request into validated structured intent such as specialty and location. That intent drives a deterministic provider-directory query. If the model is unavailable or returns malformed output, a keyword fallback keeps the demo working. AI does not invent hospitals, doctors, availability, medicines, or diagnoses.

### Kenya / African Context (~100 words)

In many Kenyan and broader African settings, people combine smartphone access with intermittent connectivity and costly data. Care navigation often still depends on word-of-mouth or fragmented information, and a trip across Nairobi for the wrong facility is expensive. FikaAI explores an offline-tolerant navigation approach using channels people already understand — starting with a PWA, with SMS/USSD simulators retained as secondary interfaces — while keeping claims limited to a synthetic demonstration directory.

### Responsible AI (~100 words)

FikaAI does not perform autonomous diagnosis. Urgent language triggers a safety message directing people to emergency help without assessing clinical severity. Provider availability shown in the prototype is synthetic demonstration data, not verified live hospital status. The system collects minimal information for the demo journey and feedback, and advises users not to enter sensitive medical details. Offline journey data remains on-device until synchronization. Limitations are documented openly in the README and project materials.
