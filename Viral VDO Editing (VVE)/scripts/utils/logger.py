import os
from datetime import datetime
from pathlib import Path
try:
    from utils.registry import get_raw_folder, load_registry
except ImportError:
    from registry import get_raw_folder, load_registry

def write_clip_log(project_name):
    """
    Auto-generates a CLIP_LOG.md in the project's raw folder on V: Drive.
    This acts as memory for both the AI and the user.
    """
    if not project_name:
        return
        
    raw_folder_str = get_raw_folder(project_name)
    if not raw_folder_str:
        return
        
    raw_folder = Path(raw_folder_str)
    if not raw_folder.exists():
        return
        
    reg = load_registry()
    if project_name not in reg.get("projects", {}):
        return
        
    p_data = reg["projects"][project_name]
    status = p_data.get("status", "wip")
    last_step = p_data.get("last_step", "00")
    last_run = p_data.get("last_run", "")
    
    # Check if log already exists to append progress table, or just rewrite it
    log_path = raw_folder / "CLIP_LOG.md"
    
    # For simplicity, we just completely rewrite the log to keep it clean and current.
    # We can embed a static steps list and mark them.
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    status_icon = "🔄 WIP"
    if status == "done":
        status_icon = "✅ Done"
    elif status == "new":
        status_icon = "🆕 New"
    else:
        status_icon = status

    content = f"# {project_name} — VVE Clip Log\n"
    content += f"> Last updated: {now_str}\n\n"
    content += f"## Status: {status_icon} (Step {last_step})\n\n"
    
    content += "## 📝 AI Notes / Memory\n"
    content += "- (Write any specific notes or reminders for this clip here)\n\n"
    
    # You could dynamically append to a progress table here in the future
    content += "---\n"
    content += f"**Registry Data:**\n"
    content += f"- Created: {p_data.get('created', '')}\n"
    content += f"- Channel: {p_data.get('channel', '')}\n"
    
    try:
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(content)
    except Exception as e:
        print(f"⚠️ Failed to write CLIP_LOG.md: {e}")
