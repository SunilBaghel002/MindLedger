# MindLedger Chrome Extension — Privacy Policy

**Effective Date:** August 24, 2026  
**Version:** 1.0.0  

MindLedger is built on a strict **Local-First, Privacy-First Architecture**. We believe your digital wellbeing and browsing habits are strictly personal.

---

## 1. Zero External Data Collection
- The MindLedger Chrome Extension **NEVER** sends your browsing history, URLs, titles, video IDs, or telemetry to any external cloud server, analytics provider, or third party.
- All network communication is strictly bound to `http://127.0.0.1:8787` (your own computer's local loopback interface).

## 2. Information Handled Locally
- **Active Webpage URLs & Domain Names**: Used solely to compute daily screen time and aggregate category analytics (Learning, Productive, Leisure) on your local SQLite database.
- **YouTube Video Watch Duration**: Used solely to log learning vs leisure video durations locally.
- **Daily Domain Limits**: Evaluated locally to support your self-defined digital wellbeing and focus boundaries.

## 3. Storage & Buffering
- When the MindLedger desktop application is temporarily closed, events are buffered strictly within your browser's local sandbox (`chrome.storage.local`).
- Buffered data is flushed directly to your local database once the local backend is detected.

## 4. Single Purpose Statement
The sole purpose of the MindLedger Chrome Extension is to provide local-first personal productivity analytics and digital wellbeing focus support for the user.

## 5. Contact & Open Source
For questions, feature requests, or audits, visit the official repository:  
[GitHub - SunilBaghel002/MindLedger](https://github.com/SunilBaghel002/MindLedger)
