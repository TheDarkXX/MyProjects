import sys
import os
from pathlib import Path

# Add utils to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
try:
    from registry import load_registry
    from capcut_utils import CAPCUT_PROJECTS_ROOT
except ImportError:
    print("❌ Error: Could not import utils modules")
    sys.exit(1)

VVE_ROOT = Path(__file__).resolve().parent.parent
DASHBOARD_MD_PATH = VVE_ROOT / "PROJECT_DASHBOARD.md"

def count_total_capcut_projects():
    """Count total folders in CapCut projects root."""
    try:
        root_path = Path(CAPCUT_PROJECTS_ROOT)
        if not root_path.exists():
            return 0
        return sum(1 for item in root_path.iterdir() if item.is_dir())
    except Exception:
        return "?"

def format_time_ago(timestamp_str):
    """Convert '2026-07-09 10:00:00' to 'X mins ago'"""
    try:
        from datetime import datetime
        last_run = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
        now = datetime.now()
        diff = now - last_run
        
        minutes = diff.total_seconds() / 60
        if minutes < 1:
            return "just now"
        elif minutes < 60:
            return f"{int(minutes)} mins ago"
        elif minutes < 1440:
            return f"{int(minutes / 60)} hrs ago"
        else:
            return f"{int(minutes / 1440)} days ago"
    except Exception:
        return timestamp_str

def generate_dashboard():
    """Generate both Terminal output and Markdown file for the dashboard."""
    reg = load_registry()
    active_project = reg.get("active_project", "")
    projects = reg.get("projects", {})
    
    total_capcut = count_total_capcut_projects()
    total_registered = len(projects)
    
    # Sort projects by last_run descending
    sorted_projects = sorted(
        projects.values(), 
        key=lambda x: x.get("last_run", ""), 
        reverse=True
    )
    
    # --- 1. Terminal Output ---
    print(f"\n📋 VVE Project Dashboard ({total_registered} registered / {total_capcut} total in CapCut)")
    print("═══════════════════════════════════════════════════════════════════════════")
    print(f" {'#':<2} │ {'Project':<20} │ {'Channel':<10} │ {'Step':<4} │ {'Status':<6} │ {'Last Run':<15}")
    print("───┼──────────────────────┼────────────┼──────┼────────┼────────────────")
    
    for idx, p in enumerate(sorted_projects, 1):
        name = p.get("capcut_name", "Unknown")
        
        # Highlight active
        is_active = (name == active_project)
        prefix = "★" if is_active else str(idx)
        
        channel = p.get("channel", "")[:10]
        step = p.get("last_step", "")[:4]
        
        raw_status = p.get("status", "")
        if raw_status == "done":
            status = "✅ Done"
        elif raw_status == "wip":
            status = "🔄 WIP "
        elif raw_status == "new":
            status = "🆕 New "
        else:
            status = raw_status[:6]
            
        last_run = format_time_ago(p.get("last_run", ""))[:15]
        
        if is_active:
            # Add some terminal bold/color if possible, but keep simple for now
            print(f" {prefix:<2} │ {name:<20} │ {channel:<10} │ {step:<4} │ {status:<6} │ {last_run:<15}")
        else:
            print(f" {prefix:<2} │ {name:<20} │ {channel:<10} │ {step:<4} │ {status:<6} │ {last_run:<15}")
            
    print("═══════════════════════════════════════════════════════════════════════════")
    if active_project:
        print(f" ★ = Active Project")
    else:
        print(f" ⚠️ No active project set. Run: python scripts/cli/switch_project.py <name>")
        
    # --- 2. Markdown Generation ---
    try:
        from datetime import datetime
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        md_content = f"# 📋 VVE Project Dashboard\n> Last updated: {now_str}\n\n"
        
        # Active Project Section
        if active_project and active_project in projects:
            p = projects[active_project]
            md_content += f"**Current Active Project:** `{active_project}`\n\n"
            md_content += f"- **Status:** {p.get('status', 'wip')} (Step {p.get('last_step', '00')})\n"
            md_content += f"- **Last Run:** {p.get('last_run', '')}\n"
            if p.get("raw_folder"):
                md_content += f"- **Raw Folder (V: Drive):** `{p.get('raw_folder')}`\n"
            md_content += "\n---\n\n"
        else:
            md_content += "**⚠️ No active project set.**\n\n---\n\n"
            
        # Table Section
        md_content += "## Other Registered Projects\n\n"
        md_content += "| Active | Project | Raw Folder (V: Drive) | Step | Status | Last Run |\n"
        md_content += "|:---:|---|---|:---:|:---:|---|\n"
        
        for p in sorted_projects:
            name = p.get("capcut_name", "Unknown")
            is_active = "⭐" if name == active_project else ""
            step = p.get("last_step", "00")
            raw_status = p.get("status", "")
            raw_folder = p.get("raw_folder", "-")
            
            if raw_status == "done":
                status = "✅ Done"
            elif raw_status == "wip":
                status = "🔄 WIP"
            elif raw_status == "new":
                status = "🆕 New"
            else:
                status = raw_status
                
            md_content += f"| {is_active} | **{name}** | `{raw_folder}` | {step} | {status} | {format_time_ago(p.get('last_run', ''))} |\n"
            
        with open(DASHBOARD_MD_PATH, "w", encoding="utf-8") as f:
            f.write(md_content)
            
        print(f"\n📝 Dashboard markdown updated at: {DASHBOARD_MD_PATH.name}")
        
    except Exception as e:
        print(f"\n⚠️ Could not generate Markdown dashboard: {e}")

if __name__ == "__main__":
    # Force UTF-8 output
    if sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
    generate_dashboard()
