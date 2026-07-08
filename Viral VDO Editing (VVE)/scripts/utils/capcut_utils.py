"""
capcut_utils.py — Single Gateway สำหรับอ่าน/เขียน CapCut draft_content.json

กฎเหล็ก: ห้ามเขียน draft_content.json ตรงๆ ทุกสคริปต์ต้องผ่าน safe_save_draft() เท่านั้น!
ฟังก์ชันนี้จะ:
  1. Force close CapCut (ป้องกัน auto-save ทับ)
  2. สร้าง backup (.bak)
  3. เขียน JSON
"""

import os
import sys
import json
import shutil
import subprocess

# CapCut project root (locked path)
CAPCUT_PROJECTS_ROOT = r"C:\Users\Admin\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft"

# Force UTF-8 output
if hasattr(sys.stdout, 'reconfigure') and sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')


def get_project_path(project_name: str) -> str:
    """Get the full path to a CapCut project folder by name.
    
    Accepts:
      - Project name (e.g. "Test Auto") → resolves from CAPCUT_PROJECTS_ROOT
      - Full path to project folder
      - Full path to draft_content.json
    """
    # Already a full path to a JSON or TMP file?
    if os.path.isabs(project_name) and os.path.isfile(project_name):
        return os.path.dirname(project_name)
    
    # Already a full path to project folder?
    if os.path.isabs(project_name) and os.path.isdir(project_name):
        return project_name
    
    # Resolve by project name
    project_path = os.path.join(CAPCUT_PROJECTS_ROOT, project_name)
    if os.path.isdir(project_path):
        return project_path
    
    raise FileNotFoundError(f"CapCut project not found: {project_name}\n  Searched: {project_path}")


def get_draft_path(project_name: str) -> str:
    """Get the active draft_content.json (the one most recently modified by CapCut)."""
    project_path = get_project_path(project_name)
    
    # If a direct json or tmp path was provided
    if (project_name.endswith("draft_content.json") or project_name.endswith(".tmp")) and os.path.exists(project_name):
        return project_name
        
    import glob
    drafts = glob.glob(os.path.join(project_path, "**", "draft_content.json"), recursive=True)
    if not drafts:
        raise FileNotFoundError(f"No draft_content.json found in: {project_path}")
        
    # CapCut 8.8+ might use Timelines/<UUID>/draft_content.json
    # We find the one with the most recent modification time
    newest_draft = max(drafts, key=os.path.getmtime)
    return newest_draft


def load_draft(project_name: str) -> dict:
    """Load and return the draft_content.json data for a project."""
    draft_path = get_draft_path(project_name)
    with open(draft_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def force_close_capcut():
    """Force close CapCut application to prevent auto-save conflicts."""
    force_close_script = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "force_close_capcut.py"
    )
    if os.path.exists(force_close_script):
        print("   🔒 Closing CapCut safely...")
        subprocess.run(
            [sys.executable, force_close_script],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
    else:
        # Fallback: kill by process name
        subprocess.run(
            ["taskkill", "/F", "/IM", "CapCut.exe"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )


def safe_save_draft(project_name: str, draft_data: dict, skip_backup: bool = False, step_name: str = None):
    """
    🔐 THE ONLY WAY to save draft_content.json.
    
    1. Force close CapCut (prevent auto-save overwrite)
    2. Create .bak backup
    3. Write JSON atomically to ALL draft locations
    4. Delete all .tmp caches so CapCut is forced to read the JSON
    5. Save snapshot for time-travel
    """
    project_dir = get_project_path(project_name)
    
    # Step 1: ALWAYS close CapCut first!
    force_close_capcut()
    
    import glob
    drafts = glob.glob(os.path.join(project_dir, "**", "draft_content.json"), recursive=True)
    if (project_name.endswith("draft_content.json") or project_name.endswith(".tmp")) and os.path.exists(project_name):
        drafts = [project_name]
        
    for draft_path in drafts:
        # Step 2: Backup (first time only)
        if not skip_backup:
            backup_path = draft_path + ".bak"
            if not os.path.exists(backup_path):
                shutil.copy2(draft_path, backup_path)
                
        # Step 3: Write JSON
        with open(draft_path, 'w', encoding='utf-8') as f:
            json.dump(draft_data, f, ensure_ascii=False, separators=(',', ':'))
        
    # Step 4: Force CapCut to read the new JSON by deleting its .tmp caches
    clear_capcut_cache(project_dir)
    
    print(f"   ✅ draft_content.json saved successfully (updated {len(drafts)} locations)!")
    
    # Step 5: Save snapshot for time-travel (using root draft to avoid duplicates)
    root_draft = os.path.join(project_dir, "draft_content.json")
    if step_name and os.path.exists(root_draft):
        from .snapshot import save_snapshot
        save_snapshot(project_dir, root_draft, step_name)
    
    print(f"   💡 Reopen CapCut to see the changes on your timeline.")

def clear_capcut_cache(project_dir):
    import glob
    import os
    for tmp_file in glob.glob(os.path.join(project_dir, "**", "template-*.tmp"), recursive=True):
        try: os.remove(tmp_file)
        except Exception: pass
        
    for tmp_file in glob.glob(os.path.join(project_dir, "**", "template.tmp"), recursive=True):
        try: os.remove(tmp_file)
        except Exception: pass
    print("   🧹 Cleared CapCut .tmp caches.")
