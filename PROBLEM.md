# The Problem

AI systems are increasingly capable, but many of their interfaces still assume that a user has a smartphone, continuous Internet, affordable data, and a modern application.

Those assumptions create an access and interface gap. People who rely on simpler devices, intermittent connectivity, or limited digital literacy are often asked to change how they communicate before they can benefit from AI tools.

The problem is not only device ownership. It is the mismatch between AI delivery models and the communication channels people already use day to day — including SMS and USSD-style interaction in many low-resource settings.

## Who Experiences It?

People in low-connectivity and low-resource environments, including:

* users of feature phones rather than smartphones
* users with intermittent or expensive Internet access
* users who prefer SMS or short menu-driven flows over installing another app
* communities where digital literacy and device storage/compute are constrained

This MVP does not invent population statistics. It treats those conditions as a design constraint for the prototype.

## Why Does It Matter Now?

Agentic AI is becoming more useful for everyday tasks at the same time that interface assumptions can still exclude people who do not match a high-connectivity, app-first profile.

The opportunity is to explore whether AI can be delivered through existing infrastructure and communication habits, instead of requiring users to upgrade devices, data plans, and applications first.

## What Are We Trying to Change?

> **Move the technology toward the user, rather than forcing the user to move toward the technology.**

FikaAI explores whether an agent can:

* speak through more than one channel from a shared intelligence layer
* keep working for local tasks when connectivity is limited
* queue work that needs external information
* synchronize when connectivity returns

## MVP Scope

This repository’s current MVP includes:

* Web/PWA interface
* SMS simulator
* USSD simulator
* local SQLite storage
* offline connectivity simulation
* offline request queue and synchronization
* local Ollama/Qwen integration (with a template fallback if Ollama is unavailable)
* English and Kiswahili foundations

## What Is Not Yet Implemented

* real telecom SMS delivery
* real telecom USSD connectivity
* voice/IVR
* production deployment
* large-scale multilingual support beyond English and Kiswahili foundations
