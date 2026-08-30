"""
MindLedger - Release Packaging Script
Automates bundling of:
1. React Dashboard Frontend (npm run build)
2. Standalone Windows Executable (PyInstaller)
3. Portable Release ZIP (MindLedger-v2.0-Windows-Portable.zip)
4. Chrome Extension ZIP (mindledger-chrome-extension.zip) ready for Chrome Web Store

Usage:
    python scripts/package_release.py
"""

import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
DIST_DIR = PROJECT_ROOT / "dist"
DASHBOARD_DIR = PROJECT_ROOT / "dashboard"
EXTENSION_DIR = PROJECT_ROOT / "chrome_extension"
VERSION = "2.0.0"


def log(msg: str):
    print(f"\n[MindLedger Packager] >>> {msg}")


def build_dashboard():
    log("1/4: Building Vite React Dashboard Frontend...")
    if not (DASHBOARD_DIR / "package.json").exists():
        print("Error: dashboard/package.json not found.")
        sys.exit(1)

    cmd = "npm run build"
    res = subprocess.run(cmd, cwd=str(DASHBOARD_DIR), shell=True)
    if res.returncode != 0:
        print("Error: Failed to build dashboard frontend.")
        sys.exit(1)
    log("Frontend bundle created in dashboard/dist/")


def build_extension_zip():
    log("2/4: Packaging Chrome Extension ZIP for Chrome Web Store...")
    ext_zip_path = DIST_DIR / f"mindledger-chrome-extension-v{VERSION}.zip"
    DIST_DIR.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(ext_zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(EXTENSION_DIR):
            for file in files:
                file_path = Path(root) / file
                rel_path = file_path.relative_to(EXTENSION_DIR)
                zipf.write(file_path, arcname=str(rel_path))

    log(f"Chrome Extension ZIP packaged successfully: {ext_zip_path.name}")


def build_pyinstaller_exe():
    log("3/4: Compiling Windows Standalone Executable via PyInstaller...")
    spec_path = PROJECT_ROOT / "mindledger.spec"
    if not spec_path.exists():
        print(f"Error: Spec file not found at {spec_path}")
        sys.exit(1)

    cmd = f"pyinstaller --noconfirm --clean \"{spec_path}\""
    res = subprocess.run(cmd, cwd=str(PROJECT_ROOT), shell=True)
    if res.returncode != 0:
        print("Error: PyInstaller build failed.")
        sys.exit(1)
    log("PyInstaller compilation complete. Output in dist/MindLedger/")


def package_portable_zip():
    log("4/4: Creating Portable Distribution ZIP...")
    source_dir = DIST_DIR / "MindLedger"
    if not source_dir.exists():
        print(f"Error: Compiled directory not found at {source_dir}")
        sys.exit(1)

    zip_filename = DIST_DIR / f"MindLedger-v{VERSION}-Windows-Portable.zip"
    with zipfile.ZipFile(zip_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = Path(root) / file
                rel_path = Path("MindLedger") / file_path.relative_to(source_dir)
                zipf.write(file_path, arcname=str(rel_path))

    log(f"Portable Release ZIP created: {zip_filename.name} ({zip_filename.stat().st_size / (1024*1024):.1f} MB)")


def main():
    print("=" * 65)
    print(f"  MindLedger Release Builder v{VERSION}")
    print("=" * 65)

    build_dashboard()
    build_extension_zip()
    build_pyinstaller_exe()
    package_portable_zip()

    print("\n" + "=" * 65)
    print("  ALL ARTIFACTS BUILT SUCCESSFULLY!")
    print("=" * 65)
    print(f"1. Standalone App:       dist/MindLedger/MindLedger.exe")
    print(f"2. Portable ZIP:         dist/MindLedger-v{VERSION}-Windows-Portable.zip")
    print(f"3. Chrome Extension ZIP: dist/mindledger-chrome-extension-v{VERSION}.zip")
    print("=" * 65)


if __name__ == "__main__":
    main()
