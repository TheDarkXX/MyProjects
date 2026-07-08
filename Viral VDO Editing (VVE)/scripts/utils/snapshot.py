"""
VVE Snapshot System — Time-travel for CapCut projects.

Saves a copy of draft_content.json after each pipeline step,
allowing you to freely jump between any two states.

Snapshots are stored in: {project_dir}/.snapshots/
"""

import os
import shutil
import json
from datetime import datetime

SNAPSHOT_DIR = ".snapshots"


def get_snapshot_dir(project_dir):
    """Get (and create) the snapshot directory for a project."""
    snap_dir = os.path.join(project_dir, SNAPSHOT_DIR)
    os.makedirs(snap_dir, exist_ok=True)
    return snap_dir


def save_snapshot(project_dir, draft_path, step_name):
    """
    Save the current draft_content.json as a named snapshot.

    Called AFTER a successful write, so it captures the new state.
    Also saves an 'original' snapshot on the very first run.
    """
    snap_dir = get_snapshot_dir(project_dir)

    # On first-ever snapshot, save the .bak as 'original' (pre-script state)
    original_path = os.path.join(snap_dir, "step_original.json")
    bak_path = draft_path + ".bak"
    if not os.path.exists(original_path) and os.path.exists(bak_path):
        shutil.copy2(bak_path, original_path)
        print(f"   📸 Snapshot saved: original (pre-script state)")

    # Determine next version number by scanning existing files
    version = 1
    import glob
    existing_versions = glob.glob(os.path.join(snap_dir, f"step_{step_name}_v*.json"))
    if existing_versions:
        # Extract version numbers
        import re
        v_numbers = []
        for f in existing_versions:
            match = re.search(rf"step_{step_name}_v(\d+)", f)
            if match:
                v_numbers.append(int(match.group(1)))
        if v_numbers:
            version = max(v_numbers) + 1

    # Create timestamp YYYYMMDD_HHMMSS
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save the versioned snapshot
    versioned_name = f"step_{step_name}_v{version}_{timestamp}.json"
    latest_name = f"step_{step_name}_latest.json"
    
    versioned_path = os.path.join(snap_dir, versioned_name)
    latest_path = os.path.join(snap_dir, latest_name)
    
    shutil.copy2(draft_path, versioned_path)
    shutil.copy2(draft_path, latest_path)
    
    print(f"   📸 Snapshot saved: {versioned_name} (and updated latest)")

def save_srt_snapshot(project_dir, srt_path):
    """
    Save the generated subtitles.srt as a versioned snapshot.
    """
    snap_dir = get_snapshot_dir(project_dir)
    srt_snap_dir = os.path.join(snap_dir, "srt_versions")
    os.makedirs(srt_snap_dir, exist_ok=True)
    
    version = 1
    import glob
    import re
    existing_versions = glob.glob(os.path.join(srt_snap_dir, "subtitles_v*.srt"))
    if existing_versions:
        v_numbers = []
        for f in existing_versions:
            match = re.search(r"subtitles_v(\d+)", f)
            if match:
                v_numbers.append(int(match.group(1)))
        if v_numbers:
            version = max(v_numbers) + 1
            
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    versioned_name = f"subtitles_v{version}_{timestamp}.srt"
    latest_name = "subtitles_latest.srt"
    
    versioned_path = os.path.join(srt_snap_dir, versioned_name)
    latest_path = os.path.join(srt_snap_dir, latest_name)
    
    shutil.copy2(srt_path, versioned_path)
    shutil.copy2(srt_path, latest_path)
    
    print(f"   📜 SRT Version saved: {versioned_name}")

def list_snapshots(project_dir, step_name=None):
    """
    List all available snapshots for a project.

    Returns list of (name, filepath, modified_time) tuples, sorted by name.
    """
    snap_dir = get_snapshot_dir(project_dir)
    snapshots = []
    for f in sorted(os.listdir(snap_dir)):
        if f.startswith("step_") and f.endswith(".json"):
            name = f[5:-5]  # Remove "step_" prefix and ".json" suffix
            path = os.path.join(snap_dir, f)
            mtime = datetime.fromtimestamp(os.path.getmtime(path))
            size = os.path.getsize(path)
            snapshots.append((name, path, mtime, size))
    return snapshots


def restore_snapshot(project_dir, draft_path, step_name):
    """
    Restore a snapshot by name.

    Before restoring, backs up the current state to .bak.
    Returns True on success, False if snapshot not found.
    """
    snap_dir = get_snapshot_dir(project_dir)
    
    # Check for latest first
    latest_path = os.path.join(snap_dir, f"step_{step_name}_latest.json")
    if os.path.exists(latest_path):
        snap_path = latest_path
    else:
        # Fallback to older exact name
        snap_path = os.path.join(snap_dir, f"step_{step_name}.json")

    if not os.path.exists(snap_path):
        return False

    # Backup root state before overwriting
    if os.path.exists(draft_path):
        bak_path = draft_path + ".bak"
        shutil.copy2(draft_path, bak_path)

    # Restore to ALL draft locations
    import glob
    drafts = glob.glob(os.path.join(project_dir, "**", "draft_content.json"), recursive=True)
    if draft_path not in drafts:
        drafts.append(draft_path)
        
    for d in drafts:
        shutil.copy2(snap_path, d)
    
    # Force CapCut to read the restored JSON by deleting its .tmp caches
    for tmp_file in glob.glob(os.path.join(project_dir, "**", "template-*.tmp"), recursive=True):
        try: os.remove(tmp_file)
        except Exception: pass
        
    for tmp_file in glob.glob(os.path.join(project_dir, "**", "template.tmp"), recursive=True):
        try: os.remove(tmp_file)
        except Exception: pass
            
    return True
