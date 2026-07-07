#!/usr/bin/env python3
"""
revert.py — Time-travel for CapCut projects.

ย้อนกลับ (revert) draft_content.json ไปยังสถานะของ Pipeline ขั้นตอนใดก็ได้
ที่เคยรันผ่านแล้ว ข้ามไปข้ามมาได้อิสระ!

Usage:
    python revert.py <project_name>                  → List all snapshots
    python revert.py <project_name> <step>           → Restore to step
    python revert.py <project_name> original         → Restore to pre-script state

Examples:
    python revert.py "Test Auto"                     → ดูรายการ snapshot ทั้งหมด
    python revert.py "Test Auto" 01b                 → ย้อนกลับไปหลังรัน 01b
    python revert.py "Test Auto" original            → ย้อนกลับไปก่อนรัน script ใดๆ
"""

import os
import sys
from datetime import datetime

# Add current dir to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.capcut_utils import get_project_path, get_draft_path, force_close_capcut
from utils.snapshot import list_snapshots, restore_snapshot


STEP_LABELS = {
    "original": "🕐 ก่อนรันสคริปต์ใดๆ (Original)",
    "01a":      "✂️  01a — Timebolt Cut (Manual)",
    "01b":      "🤖 01b — Silence Cut (AI/Auto)",
    "09":       "💉 09  — CapCut Inject (ซับ+B-Roll+SFX)",
    "09b":      "🎨 09b — Auto Style (ตกแต่ง Transition/สี)",
}


def print_snapshot_list(project_name):
    """Show all available snapshots."""
    project_dir = get_project_path(project_name)
    snapshots = list_snapshots(project_dir)

    if not snapshots:
        print(f"\n❌ ยังไม่มี snapshot สำหรับโปรเจกต์ '{project_name}'")
        print(f"   Snapshot จะถูกสร้างอัตโนมัติเมื่อรัน pipeline script (01a, 01b, 09, 09b)")
        return

    print(f"\n📸 Snapshots for: {project_name}")
    print(f"   Location: {os.path.join(project_dir, '.snapshots')}")
    print(f"{'':─<60}")

    for name, path, mtime, size in snapshots:
        label = STEP_LABELS.get(name, f"   {name}")
        time_str = mtime.strftime("%Y-%m-%d %H:%M:%S")
        size_kb = size / 1024
        print(f"   {label}")
        print(f"      └─ Saved: {time_str}  ({size_kb:.0f} KB)")

    print(f"{'':─<60}")
    print(f"\n💡 Usage: python revert.py \"{project_name}\" <step_name>")
    print(f"   Example: python revert.py \"{project_name}\" 01b")


def do_restore(project_name, step_name):
    """Restore a snapshot."""
    project_dir = get_project_path(project_name)
    draft_path = get_draft_path(project_name)

    # Check if snapshot exists
    snapshots = list_snapshots(project_dir)
    available = [s[0] for s in snapshots]

    if step_name not in available:
        print(f"\n❌ Snapshot '{step_name}' ไม่มีอยู่!")
        print(f"   มีเฉพาะ: {', '.join(available) if available else '(ยังไม่มี snapshot ใดๆ)'}")
        sys.exit(1)

    label = STEP_LABELS.get(step_name, step_name)

    # Force close CapCut before restoring
    force_close_capcut()

    # Do restore
    success = restore_snapshot(project_dir, draft_path, step_name)

    if success:
        print(f"\n✅ Restored successfully!")
        print(f"   Project: {project_name}")
        print(f"   State:   {label}")
        print(f"   💡 Reopen CapCut to see the restored timeline.")
    else:
        print(f"\n❌ Restore failed!")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    project = sys.argv[1]

    if len(sys.argv) == 2:
        # List mode
        print_snapshot_list(project)
    elif len(sys.argv) >= 3:
        # Restore mode
        do_restore(project, sys.argv[2])
