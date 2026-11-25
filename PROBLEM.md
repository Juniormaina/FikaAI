# The Problem

Farmers and extension officers often work where connectivity is unreliable. A smallholder may spot yellowing maize, a pest on the leaves or a sick cow far from the nearest signal, and the useful advice sits behind a connection that is not there.

The access problem is not only "finding an answer." It is knowing what to check in the field, what is urgent, and what to confirm with an extension officer, then keeping that context when the network drops.

## Who Experiences It?

People in intermittent-connectivity settings who need to:

* work out what is wrong with a crop or animal and what to check first
* know which problems are urgent, for example a closing top-dressing window or a pest outbreak
* keep a field plan and checklist available when mobile data disappears
* log observations in the field and sync them when connectivity returns
* reach guidance from a basic feature phone with no data plan

This prototype treats those conditions as a design constraint. It does not invent population statistics.

## Why Does It Matter Now?

Mobile AI assistants are becoming more capable, but many farm-advisory tools still assume continuous connectivity and a smartphone. When the network fails, the user's progress disappears with it, and farmers on basic phones are left out entirely.

FikaAI explores whether agronomy guidance can stay useful offline, and reachable by SMS and USSD, without pretending to replace a certified agronomist or veterinarian and without presenting synthetic data as verified advice.

## What Are We Trying to Change?

> **Farming guidance that works when signal doesn't.**

FikaAI's MVP demonstrates:

* natural-language intent extraction for crop and livestock questions
* deterministic ranking over a synthetic advisory library
* a lightweight farm plan with a step checklist and field observations
* offline persistence and reconnection sync
* SMS and USSD access for feature phones, in English and Kiswahili, including a poultry guide by USSD
* responsible limits (no diagnosis, no invented products or rates, hazard redirect to medical, veterinary or extension help)

## MVP Scope

* Field-ready PWA in the Field Utility & Agronomy Directive design system
* AI intent extraction with ModelScope / Ollama / deterministic fallback
* Synthetic Kenyan advisory library (maize, beans, tomatoes, potatoes, coffee, dairy cattle, poultry) and a poultry stage guide in SQLite
* Farm plan + IndexedDB offline continuity
* Sync state machine (`pending` → `syncing` → `synced` / `failed`)
* Feedback
* SMS / USSD simulators and a printable bilingual dial sheet

## What This Is Not

* a replacement for a certified agronomist or veterinarian
* a verified source of product names, application rates or thresholds
* a live national advisory or extension service
* a live SMS or USSD service (the codes shown are demo codes)
* real-time weather, price or disease-outbreak data
