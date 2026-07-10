import os
import json
import shutil
import subprocess
from pathlib import Path
from utils.capcut_utils import CAPCUT_PROJECTS_ROOT, get_project_path
from utils.registry import set_raw_folder, set_active_project, get_active_project

def setup_new_project(raw_folder_path_str, capcut_name):
    """
    1. Renames the CapCut project folder and draft_meta_info.json to match the raw_folder basename.
    2. Registers the new name and links the raw folder.
    3. Creates a Symlink in the VVE root for the AG IDE to easily access.
    """
    raw_path = Path(raw_folder_path_str).absolute()
    if not raw_path.exists():
        print(f"❌ Error: Raw folder does not exist: {raw_path}")
        return None
        
    target_name = raw_path.name # e.g. "DoctorBank EP2"
    
    # 1. Resolve current CapCut project
    try:
        current_proj_dir = Path(get_project_path(capcut_name))
    except Exception as e:
        print(f"❌ Error finding CapCut project '{capcut_name}': {e}")
        return None
        
    # If the user already named it perfectly, skip renaming
    if current_proj_dir.name != target_name:
        target_proj_dir = current_proj_dir.parent / target_name
        
        # Check if target already exists
        if target_proj_dir.exists():
            print(f"⚠️ Warning: CapCut project folder '{target_name}' already exists. Merging/Overwriting skipped. Cannot rename.")
            final_name = current_proj_dir.name
            target_proj_dir = current_proj_dir
        else:
            print(f"🔄 Renaming CapCut folder: '{current_proj_dir.name}' -> '{target_name}'")
            try:
                os.rename(current_proj_dir, target_proj_dir)
                final_name = target_name
                
                # Update draft_meta_info.json
                meta_path = target_proj_dir / "draft_meta_info.json"
                if meta_path.exists():
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta_data = json.load(f)
                    
                    # Update internal names
                    meta_data["draft_name"] = target_name
                    meta_data["draft_meta_info_name"] = target_name
                    
                    with open(meta_path, "w", encoding="utf-8") as f:
                        json.dump(meta_data, f, indent=2, ensure_ascii=False)
                        
            except Exception as e:
                print(f"❌ Error renaming CapCut project: {e}")
                final_name = current_proj_dir.name
                target_proj_dir = current_proj_dir
    else:
        final_name = target_name
        target_proj_dir = current_proj_dir

    # 2. Register
    set_raw_folder(final_name, str(raw_path))
    set_active_project(final_name)
    print(f"🔗 Linked Raw Folder '{target_name}' to CapCut Project '{final_name}'")
    
    # 3. Create Symlink in VVE Root for AG IDE to the parent Raw Clip folder
    vve_root = Path(__file__).resolve().parent.parent.parent
    symlink_path = vve_root / "All Raw Clips"
    
    # Remove existing symlink/folder if exists
    if symlink_path.exists() or symlink_path.is_symlink():
        try:
            if symlink_path.is_symlink() or symlink_path.is_file():
                symlink_path.unlink()
            elif symlink_path.is_dir():
                import _winapi
                os.system(f'rmdir "{symlink_path}"')
        except Exception as e:
            print(f"⚠️ Could not remove old symlink: {e}")
            
    try:
        parent_raw = raw_path.parent
        subprocess.run(["cmd.exe", "/c", "mklink", "/J", str(symlink_path), str(parent_raw)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"📂 Created IDE Symlink: 'All Raw Clips' -> {parent_raw}")
    except Exception as e:
        print(f"⚠️ Failed to create symlink: {e}")
        
    return final_name

def handle_init_args(sys_argv):
    """Parses sys.argv to see if user is setting up a new project or continuing."""
    if len(sys_argv) >= 3:
        raw_folder = sys_argv[1]
        capcut_name = sys_argv[2]
        final_name = setup_new_project(raw_folder, capcut_name)
        if not final_name:
            import sys
            sys.exit(1)
        return final_name
    elif len(sys_argv) == 2:
        project_name = sys_argv[1]
        set_active_project(project_name)
        return project_name
    else:
        project_name = get_active_project()
        if not project_name:
            print(f"Usage: python {sys_argv[0]} [raw_folder] <capcut_project_name>")
            import sys
            sys.exit(1)
        print(f"📌 Using active project: {project_name}")
        return project_name
