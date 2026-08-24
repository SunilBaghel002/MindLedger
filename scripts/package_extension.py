"""
MindLedger - Chrome Extension Packaging Script
Packages the chrome_extension folder into a clean ZIP archive ready for Chrome Web Store upload.

Author: MindLedger Team
Created: 2026-08-24
"""

import os
import zipfile
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
EXTENSION_DIR = ROOT_DIR / "chrome_extension"
DIST_DIR = ROOT_DIR / "dist"
OUTPUT_ZIP = DIST_DIR / "mindledger-chrome-extension.zip"


def package_extension() -> Path:
    """Package the Chrome extension directory into a clean distribution zip."""
    DIST_DIR.mkdir(parents=True, exist_ok=True)

    if OUTPUT_ZIP.exists():
        OUTPUT_ZIP.unlink()

    included_count = 0
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(EXTENSION_DIR):
            for file in files:
                # Exclude hidden files or test scratch files
                if file.startswith(".") or file.endswith(".tmp"):
                    continue

                full_path = Path(root) / file
                rel_path = full_path.relative_to(EXTENSION_DIR)
                zf.write(full_path, arcname=str(rel_path))
                included_count += 1

    file_size_kb = round(OUTPUT_ZIP.stat().st_size / 1024, 2)
    print(f"[SUCCESS] Packaged {included_count} files into {OUTPUT_ZIP} ({file_size_kb} KB)")
    return OUTPUT_ZIP


if __name__ == "__main__":
    package_extension()
