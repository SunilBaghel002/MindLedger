"""
MindLedger - Automated Packaging & Executable Build Script
Orchestrates PyInstaller packaging, bundles Chrome extension, and verifies build output.

Author: MindLedger Team
Created: 2026-08-11
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


def check_dependencies() -> None:
    """Verify PyInstaller is installed in current Python environment."""
    try:
        import PyInstaller  # type: ignore

        print(f"[BUILD] PyInstaller version: {PyInstaller.__version__}")
    except ImportError:
        print("[BUILD] PyInstaller not found. Installing pyinstaller...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "pyinstaller>=6.0.0"],
            check=True,
        )


def build_dashboard_frontend() -> None:
    """Compile latest React dashboard frontend bundle into dashboard/dist."""
    dashboard_dir = ROOT_DIR / "dashboard"
    if (dashboard_dir / "package.json").exists():
        print("[BUILD] Compiling modern React dashboard frontend (npm run build)...")
        subprocess.run(["npm.cmd" if sys.platform == "win32" else "npm", "run", "build"], cwd=dashboard_dir, check=True)
        print("[BUILD] Modern React dashboard bundle generated in dashboard/dist.")
    else:
        print("[BUILD WARNING] dashboard/package.json not found. Skipping frontend build.")


def run_pyinstaller() -> None:
    """Execute PyInstaller build using mindledger.spec."""
    spec_path = ROOT_DIR / "mindledger.spec"
    print(f"[BUILD] Executing PyInstaller with spec: {spec_path}")

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        str(spec_path),
        "--noconfirm",
        "--clean",
    ]

    res = subprocess.run(cmd, cwd=ROOT_DIR)
    if res.returncode != 0:
        print("[BUILD ERROR] PyInstaller build failed!")
        sys.exit(res.returncode)

    print("[BUILD SUCCESS] Standalone bundle built in dist/MindLedger/")


def verify_bundle() -> None:
    """Verify built dist/MindLedger bundle contains all necessary assets."""
    bundle_dir = ROOT_DIR / "dist" / "MindLedger"
    if not bundle_dir.exists():
        raise FileNotFoundError(f"Bundle directory not found at: {bundle_dir}")

    exe_file = bundle_dir / "MindLedger.exe"
    if not exe_file.exists():
        raise FileNotFoundError(f"Executable not found at: {exe_file}")

    # Copy chrome_extension to root bundle directory for convenient user side-loading in Chrome
    ext_src = ROOT_DIR / "chrome_extension"
    ext_dst = bundle_dir / "chrome_extension"
    if ext_src.exists():
        shutil.copytree(ext_src, ext_dst, dirs_exist_ok=True)
        print(f"[BUILD] Copied Chrome extension to top-level bundle: {ext_dst}")

    # Check PyInstaller contents (PyInstaller v6 uses _internal)
    internal_dir = bundle_dir / "_internal"
    check_dir = internal_dir if internal_dir.exists() else bundle_dir

    required_paths = [
        check_dir / "dashboard" / "dist",
        check_dir / "dashboard" / "static",
        check_dir / "reports" / "templates",
        ext_dst / "manifest.json",
        ext_dst / "background.js",
        ext_dst / "content_scripts" / "youtube.js",
    ]

    missing_paths = []
    for p in required_paths:
        if not p.exists():
            print(f"[BUILD WARNING] Required asset missing in bundle: {p}")
            missing_paths.append(p)
        else:
            print(f"[BUILD VERIFIED] {p.relative_to(bundle_dir)} exists.")

    if missing_paths:
        missing_str = "\n  ".join(str(p) for p in missing_paths)
        raise FileNotFoundError(
            f"Build verification failed! Missing required asset(s) in bundle:\n  {missing_str}"
        )

    print(
        f"\n[BUILD COMPLETE] Standalone MindLedger Windows package successfully built at:\n  {bundle_dir.resolve()}"
    )




def main() -> None:
    """Main build execution sequence."""
    print("=" * 60)
    print("      MindLedger Windows Packaging & Build Orchestrator")
    print("=" * 60)
    check_dependencies()
    build_dashboard_frontend()
    run_pyinstaller()
    verify_bundle()


if __name__ == "__main__":
    main()
