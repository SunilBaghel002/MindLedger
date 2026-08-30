# -*- mode: python ; coding: utf-8 -*-
"""
MindLedger PyInstaller Spec File
Configures standalone executable build for MindLedger Windows application.
"""

import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Root directory of the project
project_root = Path('.').resolve()

datas = [
    (str(project_root / 'assets'), 'assets'),
    (str(project_root / 'app.ico'), '.'),
    (str(project_root / 'dashboard' / 'dist'), 'dashboard/dist'),
    (str(project_root / 'dashboard' / 'static'), 'dashboard/static'),
    (str(project_root / 'dashboard' / 'templates'), 'dashboard/templates'),
    (str(project_root / 'reports' / 'templates'), 'reports/templates'),
    (str(project_root / 'chrome_extension'), 'chrome_extension'),
]



# Collect submodules and data files for dynamic imports
hiddenimports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',
    'fastapi',
    'fastapi.middleware.cors',
    'fastapi.staticfiles',
    'pydantic',
    'pystray',
    'pystray._win32',
    'PIL',
    'PIL.Image',
    'PIL.ImageDraw',
    'apscheduler',
    'apscheduler.schedulers.background',
    'apscheduler.triggers.cron',
    'apscheduler.triggers.interval',
    'jinja2',
    'win32gui',
    'win32process',
    'win32api',
    'win32con',
    'sqlite3',
    'httpx',
    'psutil',
    'api.server',
    'api.routes.dashboard_routes',
    'api.routes.browser_routes',
    'api.routes.category_routes',
    'api.routes.battery_routes',
    'api.routes.data_routes',
    'api.routes.limit_routes',
    'api.routes.process_routes',
    'api.routes.water_routes',
    'core.power_monitor',
    'core.process_supervisor',
    'core.app_limits',
    'core.hydration_scheduler',
    'core.window_tracker',
    'core.idle_detector',
    'core.event_processor',
    'core.session_manager',
    'database.migrations.v001_initial',
    'database.migrations.v002_battery_processes_limits_water',
    'webview',
    'webview.platforms.winforms',
    'clr_loader',
]


a = Analysis(
    ['main.py'],
    pathex=[str(project_root)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='MindLedger',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # Windowed mode (System Tray app)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(project_root / 'app.ico'),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='MindLedger',
)
