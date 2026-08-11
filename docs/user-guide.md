# MindLedger — User Guide

Welcome to **MindLedger**, a privacy-first personal digital wellbeing desktop application designed to track, analyze, and optimize your application, browsing, and YouTube productivity habits.

---

## 1. Installation & Setup

### Installing on Windows

1. Download the installer executable `MindLedger_Setup_v0.1.0.exe` from the latest release.
2. Double-click the installer and follow the setup wizard:
   - MindLedger will be installed to `%LOCALAPPDATA%\MindLedger`.
   - Optionally check **Create Desktop Shortcut** and **Automatically launch MindLedger on Windows startup**.
3. Click **Finish**. MindLedger will start automatically in the Windows System Tray (notification area near clock).

Alternatively, you can run the standalone binary `MindLedger.exe` directly from the extracted release directory.

---

## 2. Installing the Chrome Extension

To track browser domain visits and YouTube video analytics:

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click **Load unpacked**.
4. Select the `chrome_extension` folder located inside your MindLedger installation directory (`%LOCALAPPDATA%\MindLedger\chrome_extension` or `dist/MindLedger/chrome_extension`).
5. The **MindLedger Extension** icon will appear in your extension toolbar.

> [!NOTE]
> The extension communicates strictly with your local MindLedger API server at `http://127.0.0.1:8787`. No data leaves your machine.

---

## 3. Using the System Tray Manager

MindLedger runs silently in your Windows System Tray with a dark blue circular icon:

- **Hovering over the icon**: Displays current tracking status (e.g., `MindLedger - Tracking (VS Code)` or `MindLedger - Idle`).
- **Right-clicking the icon**: Opens the context menu:
  - **Status**: Live tracking status indicator.
  - **Pause / Resume Tracking**: Temporarily pause or resume active window polling.
  - **Open Dashboard**: Launches the Web Dashboard in your default web browser (`http://127.0.0.1:8787/dashboard`).
  - **Quit MindLedger**: Gracefully saves active session data and closes the application.

---

## 4. Web Dashboard Features

Open `http://127.0.0.1:8787/dashboard` to access your local analytics dashboard:

### Overview Home
- **Today's Screen Time**: Total active computer usage.
- **Productivity Score**: Dynamic score (0-100%) calculated based on productive vs. unproductive activity.
- **Hourly Activity Timeline**: 24-hour bar chart displaying productive, neutral, and unproductive time buckets.
- **Top Apps & Top Websites**: Quick breakdown of your top used tools.

### App Usage Analytics
- Detailed list of applications used with category badges, duration strings, and date range filters (Today, Yesterday, 7 Days, 30 Days).

### Browser Usage Analytics
- Visited domain analytics with URL-level breakdown and category filtering.

### YouTube Analytics
- Total YouTube watch time, Productive vs. Entertainment breakdown, Shorts vs. Longform ratio, and channel-level watch history.

### Reports Page
- Generate, preview, download HTML/PDF report attachments, or trigger daily SMTP email delivery.

### Settings Page
- Configure Gmail App Passwords for daily reports, tracking poll intervals, custom classification rules, and dataset backups.

---

## 5. Custom Classification Rules

Customize how MindLedger categorizes applications and websites:

1. Navigate to **Settings** -> **Category Rules**.
2. Click **Add Custom Rule**.
3. Select Rule Type:
   - `App`: Matches process name (e.g. `code.exe`, `slack.exe`).
   - `Domain`: Matches website hostname (e.g. `github.com`, `leetcode.com`).
   - `URL Pattern`: Regex matching (e.g. `*docs.python.org*`).
   - `Title Pattern`: Window title keywords (e.g. `*StackOverflow*`).
4. Assign Category (Coding, Learning, Browsing, Communication, Entertainment, etc.) and Productivity Level (**Productive**, **Neutral**, **Unproductive**).
5. Click **Save Rule**. MindLedger auto-reclassifies matching events in real-time.

---

## 6. Data Management & Backups

- **Export Dataset**: Go to **Settings** -> **Data & Privacy** and click **Export JSON** or **Export CSV**.
- **Import Dataset**: Upload a previously exported JSON backup file to restore tracking history.
- **Create Database Backup**: Click **Create Live DB Backup** to generate a `.db.bak` file.
- **Archive & Clean**: Automatically compress granular sessions older than 6 months into `.zip` files while preserving daily summary reports.

---

## 7. Troubleshooting & Support

- **Dashboard not loading?** Ensure `MindLedger.exe` is running in your System Tray and port `8787` is available.
- **Extension showing disconnected?** Verify that MindLedger is running and API server health check at `http://127.0.0.1:8787/api/v1/health` returns `status: ok`.
- **Logs**: System log files are saved to `logs/mindledger.log`.
