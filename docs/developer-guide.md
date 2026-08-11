# MindLedger — Developer & Contributor Setup Guide

Welcome developers! This guide provides complete instructions for setting up the **MindLedger** development environment, building the React Vite dashboard, executing test benchmarks, running PyInstaller packaging, and understanding project architecture.

---

## 1. Environment Prerequisites

- **Python**: 3.11+ (tested on Python 3.11 - 3.14)
- **Node.js**: 18.0+ & npm 9+
- **Git**: 2.30+
- **OS**: Windows 10 / 11 (pywin32 window tracking requires Windows OS)

---

## 2. Initial Repository Setup

```bash
# 1. Clone Repository
git clone https://github.com/SunilBaghel002/MindLedger.git
cd MindLedger

# 2. Create Virtual Environment
python -m venv venv

# 3. Activate Virtual Environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# 4. Install Python Dependencies
pip install -r requirements.txt
```

---

## 3. Building Dashboard Frontend (React + Vite)

The web dashboard is built with React.js, Vite, and CSS3 slate-white design tokens:

```bash
# Navigate to dashboard directory
cd dashboard

# Install npm packages
npm install

# Run Vite local development server
npm run dev

# Build production distribution bundle
npm run build
```

> [!IMPORTANT]
> `npm run build` compiles static assets to `dashboard/dist`. FastAPI serves `dashboard/dist/index.html` at `http://127.0.0.1:8787/dashboard`.

---

## 4. Running Application Local Server

Start the full application (window tracker thread, API server thread, system tray icon):

```bash
python main.py
```

- Local API Server: `http://127.0.0.1:8787`
- API Health Check: `http://127.0.0.1:8787/api/v1/health`
- Interactive OpenAPI Docs: `http://127.0.0.1:8787/docs`
- Web Dashboard: `http://127.0.0.1:8787/dashboard`

---

## 5. Running Test Suite & Performance Benchmarks

MindLedger includes comprehensive unit, integration, and performance benchmark test suites using `pytest`:

```bash
# Run full test suite
python -m pytest

# Run performance benchmarks only
python -m pytest tests/test_performance.py

# Run full integration 24h simulation test
python -m pytest tests/test_full_integration.py
```

---

## 6. Building Windows Executable Package

Package MindLedger into a standalone `.exe` and distribution folder using PyInstaller:

```bash
# Execute automated build script
python scripts/build_exe.py
```

This runs PyInstaller with [mindledger.spec](file:///c:/Users/lenovo/OneDrive/Desktop/Projects/MindLedger/mindledger.spec), copies `chrome_extension/`, and verifies bundle outputs in `dist/MindLedger/`.

---

## 7. Compiling Windows Installer (Inno Setup)

If Inno Setup Compiler (`ISCC.exe`) is installed:

```bash
iscc installer/installer.iss
```

Output installer setup binary will be created at `dist/installer/MindLedger_Setup_v0.1.0.exe`.

---

## 8. Directory Architecture

```
MindLedger/
├── api/                    # FastAPI routers (dashboard, browser, categories, data)
├── ai/                     # Rules engine, productivity scorer, insight generator
├── chrome_extension/       # Chrome Manifest V3 extension & content scripts
├── config/                 # Settings dataclass & constants
├── core/                   # Active window tracker, idle detector, event processor
├── dashboard/              # React.js Vite frontend & templates
├── database/               # SQLite connection pool, repositories, and migrations
├── docs/                   # Documentation & context guides
├── installer/              # Inno Setup installer script (installer.iss)
├── reports/                # Report generator, chart renderer, Jinja2 HTML templates
├── scripts/                # Build orchestrator (build_exe.py)
├── tests/                  # Pytest unit, integration, and benchmark test suites
├── utils/                  # Logger, profiler, data_manager, cloud_sync
├── main.py                 # Application entry point
├── mindledger.spec         # PyInstaller build spec
└── requirements.txt        # Python package dependencies
```
