#!/usr/bin/env python3
"""
mark_perfect.py — ปักหมุดจุด "Perfect" ให้โปรเจกต์ CapCut

บันทึกสถานะปัจจุบันของ CapCut timeline + ไฟล์ metadata ทั้งหมด
เป็นจุด revert ที่สมบูรณ์แบบ สามารถปักหมุดได้หลายจุด
พร้อมคำอธิบายว่า "perfect ตรงไหน"

Usage:
    python mark_perfect.py <project_name>                          → Mark with auto label
    python mark_perfect.py <project_name> "ซับเป๊ะ 100%"          → Mark with custom label
    python mark_perfect.py <project_name> --list                   → List all perfect marks

Revert:
    python revert.py <project_name> perfect_1                      → Restore to perfect mark #1
    python revert.py <project_name> perfect_2                      → Restore to perfect mark #2
"""

import os
import sys
import json
import shutil
from datetime import datetime
from pathlib import Path

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.capcut_utils import get_project_path, get_draft_path
from utils.snapshot import get_snapshot_dir

MANIFEST_NAME = "perfect_marks.json"

# Files to backup alongside the CapCut draft
METADATA_FILES = [
    "transcript.json",
    "transcript.raw.json",
    "transcript.grouped.json",
    "ai_segmented_latest.txt",
    "editorial_decisions.json",
    "scene_table.json",
    "final_rendered_text.txt",
]

METADATA_SUBDIRS = {
    "intermediates/subtitles.srt": "subtitles.srt",
}


def load_manifest(snap_dir):
    """Load or create the perfect marks manifest."""
    manifest_path = os.path.join(snap_dir, MANIFEST_NAME)
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"marks": []}


def save_manifest(snap_dir, manifest):
    """Save the perfect marks manifest."""
    manifest_path = os.path.join(snap_dir, MANIFEST_NAME)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)


def get_next_mark_id(manifest):
    """Get the next available perfect mark ID."""
    if not manifest["marks"]:
        return 1
    return max(m["id"] for m in manifest["marks"]) + 1


def detect_current_step(snap_dir):
    """Detect the latest pipeline step by checking which step_*_latest.json has the newest mtime."""
    import glob
    latest_files = glob.glob(os.path.join(snap_dir, "step_*_latest.json"))
    if not latest_files:
        return "unknown"
    
    # Filter out perfect_latest itself
    latest_files = [f for f in latest_files if "perfect" not in os.path.basename(f)]
    if not latest_files:
        return "unknown"
    
    newest = max(latest_files, key=os.path.getmtime)
    basename = os.path.basename(newest)
    # step_06_latest.json -> 06
    step = basename.replace("step_", "").replace("_latest.json", "")
    return step


def do_mark(project_name, label=None):
    """Create a new perfect mark."""
    project_dir = get_project_path(project_name)
    draft_path = get_draft_path(project_name)
    snap_dir = get_snapshot_dir(project_dir)

    manifest = load_manifest(snap_dir)
    mark_id = get_next_mark_id(manifest)
    mark_name = f"perfect_{mark_id}"
    
    current_step = detect_current_step(snap_dir)
    timestamp = datetime.now()
    
    if not label:
        label = f"Step {current_step} - Perfect Mark #{mark_id}"

    # 1. Save the CapCut draft as a snapshot
    draft_snap_path = os.path.join(snap_dir, f"step_{mark_name}.json")
    latest_snap_path = os.path.join(snap_dir, f"step_{mark_name}_latest.json")
    shutil.copy2(draft_path, draft_snap_path)
    shutil.copy2(draft_path, latest_snap_path)

    # 2. Backup metadata files
    backup_dir = os.path.join(snap_dir, f"{mark_name}_backup")
    os.makedirs(backup_dir, exist_ok=True)

    backed_up = []
    for fname in METADATA_FILES:
        src = os.path.join(project_dir, fname)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(backup_dir, fname))
            backed_up.append(fname)

    for src_rel, dst_name in METADATA_SUBDIRS.items():
        src = os.path.join(project_dir, src_rel)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(backup_dir, dst_name))
            backed_up.append(dst_name)

    # 3. Record in manifest
    manifest["marks"].append({
        "id": mark_id,
        "name": mark_name,
        "label": label,
        "step": current_step,
        "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "files_backed_up": backed_up,
    })
    save_manifest(snap_dir, manifest)

    # 4. Print summary
    print(f"\n{'='*60}")
    print(f"  Perfect Mark #{mark_id} Saved!")
    print(f"{'='*60}")
    print(f"  Project : {project_name}")
    print(f"  Label   : {label}")
    print(f"  Step    : {current_step}")
    print(f"  Time    : {timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Files   : {len(backed_up)} metadata files backed up")
    print(f"{'='*60}")
    print(f"\n  To revert to this point:")
    print(f'    python scripts/revert.py "{project_name}" {mark_name}')
    print()


def do_list(project_name):
    """List all perfect marks."""
    project_dir = get_project_path(project_name)
    snap_dir = get_snapshot_dir(project_dir)
    manifest = load_manifest(snap_dir)

    if not manifest["marks"]:
        print(f"\n  No perfect marks for '{project_name}' yet.")
        print(f'  Create one: python scripts/mark_perfect.py "{project_name}"')
        return

    print(f"\n  Perfect Marks for: {project_name}")
    print(f"  {'='*56}")
    for m in manifest["marks"]:
        print(f"  #{m['id']}  {m['name']}")
        print(f"      Label : {m['label']}")
        print(f"      Step  : {m['step']}")
        print(f"      Time  : {m['timestamp']}")
        print(f"      Files : {len(m.get('files_backed_up', []))} backed up")
        print(f"      Revert: python scripts/revert.py \"{project_name}\" {m['name']}")
        print()
    print(f"  {'='*56}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    project = sys.argv[1]

    if len(sys.argv) >= 3 and sys.argv[2] == "--list":
        do_list(project)
    elif len(sys.argv) >= 3:
        do_mark(project, label=sys.argv[2])
    else:
        do_mark(project)
