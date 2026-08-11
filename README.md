# MindLedger — Personal Digital Wellbeing Desktop Application

[![Python Version](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite3-WAL_Mode-003B57.svg)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**MindLedger** is a privacy-first, local digital wellbeing desktop application for Windows. It silently tracks active application usage, Chrome browser tab visits, and YouTube video analytics, providing actionable productivity scoring, daily HTML email reports, and a slate-white local web dashboard.

---

## Key Features

- 🛡️ **Strictly Privacy-First**: 100% local SQLite database. API server binds **ONLY** to `127.0.0.1`. Zero telemetry, zero analytics, zero external network requests (SMTP email delivery only).
- ⏱️ **Active Window & Idle Tracking**: Background tracking loop polls active Windows OS foreground windows every 2 seconds with automatic 5-minute idle & sleep detection.
- 🌐 **Chrome Extension (Manifest V3)**: Tracks tab URLs, domain visit durations, and YouTube channel/video metrics. Buffers events locally if offline.
- 🧠 **AI Rules & Productivity Scorer**: Dynamic classification engine categorizes sessions into Productive, Neutral, and Unproductive tiers with customizable user rules.
- 📊 **Slate-White Web Dashboard**: Responsive React.js SPA featuring real-time activity timelines, top apps/websites, YouTube breakdown, and Chart.js analytics.
- 📧 **Automated Reports**: Generates Jinja2 daily/weekly/monthly reports with inline chart images delivered via Gmail SMTP.
- ⚡ **High Performance Engine**: SQLite WAL connection pooling, 64MB RAM caching, and composite database indexing (< 100ms API response latency).
- 📦 **Packageable Binary**: Bundled standalone `MindLedger.exe` and Inno Setup Windows Installer script.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MINDLEDGER ARCHITECTURE                        │
│                                                                         │
│  ┌────────────────────────┐   ┌───────────────────┐   ┌──────────────┐ │
│  │ System Window Tracker  │   │ Chrome Extension  │   │ Idle Detect  │ │
│  │ (win32 / psutil)       │   │ (Manifest V3)     │   │ (pynput)     │ │
│  └───────────┬────────────┘   └─────────┬─────────┘   └──────┬───────┘ │
│              │                          │                    │         │
│              └─────────────────┐        │        ┌───────────┘         │
│                                ▼        ▼        ▼                     │
│                        ┌───────────────────────────────────┐           │
│                        │ FastAPI Server (localhost:8787)   │           │
│                        └────────────────┬──────────────────┘           │
│                                         │                              │
│                                         ▼                              │
│                        ┌───────────────────────────────────┐           │
│                        │ SQLite Database (mindledger.db)   │           │
│                        └────────────────┬──────────────────┘           │
│                                         │                              │
│              ┌──────────────────────────┼──────────────────────────┐   │
│              ▼                          ▼                          ▼   │
│   ┌────────────────────┐     ┌────────────────────┐     ┌────────────┐ │
│   │ React Dashboard UI │     │ System Tray App    │     │ Email      │ │
│   │ (localhost:8787)   │     │ (pystray)          │     │ Reports    │ │
│   └────────────────────┘     └────────────────────┘     └────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Quickstart Guide

### Option 1: Standalone Installer (Windows End Users)

1. Download `MindLedger_Setup_v0.1.0.exe` from Releases.
2. Run installer script. MindLedger will start automatically in your Windows System Tray.
3. Open `chrome://extensions` in Chrome, turn on **Developer mode**, click **Load unpacked**, and select the `%LOCALAPPDATA%\MindLedger\chrome_extension` folder.
4. Access your dashboard at [http://127.0.0.1:8787/dashboard](http://127.0.0.1:8787/dashboard).

---

### Option 2: Local Development Setup

```bash
# 1. Clone Repo & Create Virtualenv
git clone https://github.com/SunilBaghel002/MindLedger.git
cd MindLedger
python -m venv venv
.\venv\Scripts\Activate.ps1

# 2. Install Requirements
pip install -r requirements.txt

# 3. Build React Dashboard
cd dashboard
npm install
npm run build
cd ..

# 4. Run MindLedger Engine
python main.py
```

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Core** | Python 3.11+ | Core tracking engine, thread orchestrator |
| **API Server** | FastAPI & Uvicorn | Local ASGI API server on `127.0.0.1:8787` |
| **Database** | SQLite3 (WAL mode) | Local encrypted storage & connection pooling |
| **OS Window Tracker** | `pywin32` & `psutil` | Active foreground window & process polling |
| **System Tray** | `pystray` & Pillow | Windows notification tray icon & controls |
| **Browser Extension** | JavaScript (Manifest V3) | Tab URL & YouTube content script tracking |
| **Dashboard UI** | React.js, Vite, Chart.js | Slate-white theme analytics web app |
| **Packaging** | PyInstaller & Inno Setup | Windows standalone `.exe` & installer build |

---

## Documentation Links

- 📖 [User Guide](docs/user-guide.md): Installation, Chrome Extension, System Tray, & Dashboard guide.
- 🛠️ [Developer Setup Guide](docs/developer-guide.md): Environment setup, architecture, testing, & packaging guide.
- 📐 [Architecture Specifications](context/architecture.md): Deep dive into system architecture & database schema.
- 📋 [Progress Tracker](context/progress-tracker.md): Project roadmap & phase status tracker.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
