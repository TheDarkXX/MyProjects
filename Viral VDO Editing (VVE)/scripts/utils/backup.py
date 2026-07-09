import os
import shutil
from pathlib import Path

try:
    from utils.registry import get_raw_folder
    from utils.capcut_utils import get_project_path
except ImportError:
    from registry import get_raw_folder
    from capcut_utils import get_project_path

def insurance_backup(project_name):
    """
    Copies critical AI-generated files from the CapCut Draft project folder
    back to the V: Drive (raw_folder) into a '_vve_backup' folder.
    This protects against CapCut draft deletion.
    """
    if not project_name:
        return False
        
    raw_folder_str = get_raw_folder(project_name)
    if not raw_folder_str:
        return False
        
    raw_folder = Path(raw_folder_str)
    if not raw_folder.exists():
        print(f"⚠️ Backup Warning: Raw folder '{raw_folder}' does not exist.")
        return False
        
    try:
        project_dir_str = get_project_path(project_name)
        project_dir = Path(project_dir_str)
    except Exception as e:
        print(f"⚠️ Backup Warning: Could not resolve project path for '{project_name}': {e}")
        return False
        
    if not project_dir.exists():
        return False
        
    backup_dir = raw_folder / "_vve_backup"
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    files_to_backup = [
        "transcript.json",
        "editorial_decisions.json",
        "ai_segmented_latest.txt",
        "scene_table.json",
        "scene_table.md"
    ]
    
    backed_up_count = 0
    for filename in files_to_backup:
        src = project_dir / filename
        if src.exists():
            dst = backup_dir / filename
            try:
                shutil.copy2(src, dst)
                backed_up_count += 1
            except Exception as e:
                print(f"⚠️ Failed to backup {filename}: {e}")
                
    if backed_up_count > 0:
        print(f"🔒 Insurance Backup: Synced {backed_up_count} file(s) to '{backup_dir.name}'")
        
    return True
