import os
import json
from datetime import datetime
from pathlib import Path

# Registry file location: C:\My Claw\MyProjects\Viral VDO Editing (VVE)\vve_registry.json
VVE_ROOT = Path(__file__).resolve().parent.parent.parent
REGISTRY_PATH = VVE_ROOT / "vve_registry.json"

def load_registry():
    """Load the registry JSON file. Create if it doesn't exist."""
    if not REGISTRY_PATH.exists():
        default_registry = {
            "active_project": "",
            "projects": {}
        }
        _save_registry_data(default_registry)
        return default_registry
    
    try:
        with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        print(f"⚠️ Error parsing {REGISTRY_PATH}. Resetting registry.")
        return {"active_project": "", "projects": {}}

def _save_registry_data(data):
    """Save the registry dictionary to file."""
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def get_active_project():
    """Return the name of the currently active project."""
    reg = load_registry()
    return reg.get("active_project", "")

def set_active_project(project_name):
    """Set the currently active project and auto-register it if new."""
    reg = load_registry()
    
    # Auto register if it's new
    if project_name and project_name not in reg["projects"]:
        _register_project_internal(reg, project_name)
        
    reg["active_project"] = project_name
    _save_registry_data(reg)
    return True

def _register_project_internal(reg, project_name, channel="doctorbank", notes=""):
    """Internal function to add/update project in registry object."""
    if "projects" not in reg:
        reg["projects"] = {}
        
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if project_name not in reg["projects"]:
        reg["projects"][project_name] = {
            "capcut_name": project_name,
            "channel": channel,
            "created": now_str,
            "last_step": "00",
            "last_run": now_str,
            "status": "new",
            "notes": notes
        }
    else:
        # Update existing
        if channel: reg["projects"][project_name]["channel"] = channel
        if notes: reg["projects"][project_name]["notes"] = notes
        reg["projects"][project_name]["last_run"] = now_str
        
def register_project(project_name, channel="doctorbank", notes=""):
    """Register a new project or update an existing one without changing active status."""
    reg = load_registry()
    _register_project_internal(reg, project_name, channel, notes)
    _save_registry_data(reg)

def update_step(project_name, step, status="wip"):
    """Update the last_step and status of a project. Auto-registers if missing."""
    if not project_name:
        return
        
    reg = load_registry()
    
    if project_name not in reg["projects"]:
        _register_project_internal(reg, project_name)
        
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    reg["projects"][project_name]["last_step"] = step
    reg["projects"][project_name]["status"] = status
    reg["projects"][project_name]["last_run"] = now_str
    
    # Mark as done if it's step 11, 12, or 10b
    if step in ["11", "12", "10b"]:
        reg["projects"][project_name]["status"] = "done"
        
    _save_registry_data(reg)
    
    # Auto-generate CLIP_LOG.md
    try:
        from utils.logger import write_clip_log
        write_clip_log(project_name)
    except Exception:
        pass

def set_raw_folder(project_name, raw_folder_path):
    """Link a raw folder to the project in the registry."""
    if not project_name or not raw_folder_path:
        return
    
    reg = load_registry()
    if project_name not in reg["projects"]:
        _register_project_internal(reg, project_name)
        
    reg["projects"][project_name]["raw_folder"] = str(Path(raw_folder_path).absolute())
    _save_registry_data(reg)

def get_raw_folder(project_name):
    """Get the linked raw folder for a project. Returns None if not set."""
    if not project_name:
        return None
        
    reg = load_registry()
    if project_name in reg["projects"]:
        return reg["projects"][project_name].get("raw_folder")
    return None
