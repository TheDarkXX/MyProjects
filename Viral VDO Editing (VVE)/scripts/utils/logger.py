import os
import glob
from datetime import datetime
from pathlib import Path
try:
    from utils.registry import get_raw_folder, load_registry
    from utils.capcut_utils import get_project_path
except ImportError:
    from registry import get_raw_folder, load_registry
    try:
        from capcut_utils import get_project_path
    except ImportError:
        get_project_path = None

STEPS_DEFINITION = [
    ("01a", "Timebolt Cut"),
    ("01b", "Silence Cut"),
    ("02",  "Extract Audio"),
    ("03",  "Transcribe (Whisper)"),
    ("03b", "Preview Subtitles"),
    ("04",  "Editorial Agent (AI ตัดสินใจ)"),
    ("04b", "Apply Editorial Cuts"),
    ("05",  "Word Segment"),
    ("05b", "Align AI Text"),
    ("06",  "Generate SRT"),
    ("07",  "B-Roll Agent (AI เลือกภาพ)"),
    ("08",  "Footage Assembler"),
    ("09",  "Audio Polisher"),
    ("10",  "CapCut Inject"),
    ("10b", "Final Subtitles"),
    ("11",  "QA Recheck"),
    ("12",  "Final Render")
]

def _scan_snapshots(project_name):
    """Scan .snapshots folder to find which steps actually have snapshots and how many versions."""
    snapshot_info = {}
    try:
        if get_project_path:
            proj_dir = Path(get_project_path(project_name))
        else:
            return snapshot_info
    except Exception:
        return snapshot_info
    
    snap_dir = proj_dir / ".snapshots"
    if not snap_dir.exists():
        return snapshot_info
    
    for s_id, _ in STEPS_DEFINITION:
        # Count version files: step_04b_v1_*.json, step_04b_v2_*.json, etc.
        pattern = f"step_{s_id}_v*_*.json"
        versions = list(snap_dir.glob(pattern))
        
        # Also check for the base snapshot: step_04b.json
        base = snap_dir / f"step_{s_id}.json"
        latest = snap_dir / f"step_{s_id}_latest.json"
        
        has_snapshot = base.exists() or latest.exists() or len(versions) > 0
        
        if has_snapshot:
            # Find the latest timestamp
            all_files = versions + ([base] if base.exists() else []) + ([latest] if latest.exists() else [])
            latest_time = max(f.stat().st_mtime for f in all_files) if all_files else 0
            latest_dt = datetime.fromtimestamp(latest_time).strftime("%Y-%m-%d %H:%M") if latest_time else ""
            
            snapshot_info[s_id] = {
                "versions": len(versions),
                "latest_time": latest_dt,
            }
    
    return snapshot_info

def _scan_project_files(project_name):
    """Scan CapCut project folder for important output files."""
    files_found = []
    try:
        if get_project_path:
            proj_dir = Path(get_project_path(project_name))
        else:
            return files_found
    except Exception:
        return files_found
    
    important_files = [
        ("cut_audio_16k.wav", "Extracted audio (16kHz)"),
        ("transcript.raw.json", "Whisper raw transcript"),
        ("transcript.json", "Processed transcript"),
        ("transcript.grouped.json", "Word-segmented groups"),
        ("editorial_decisions.json", "AI editorial cuts"),
        ("scene_table.json", "Scene breakdown"),
        ("scene_table.md", "Scene breakdown (readable)"),
        ("ai_segmented_latest.txt", "AI-aligned subtitle text"),
        ("transcript.srt", "Final subtitle file"),
        ("replacements.json", "Word corrections"),
        ("final_rendered_text.txt", "Final rendered text"),
    ]
    
    for fname, desc in important_files:
        fpath = proj_dir / fname
        if fpath.exists():
            size_kb = round(fpath.stat().st_size / 1024, 1)
            files_found.append((fname, desc, f"{size_kb}KB"))
    
    return files_found


def _preserve_sections(log_path):
    """Read existing CLIP_LOG.md and preserve manually-written sections."""
    sections = {
        "notes": "- (Write any specific notes or reminders for this clip here)\n",
        "issues": "",
        "outstanding": "",
    }
    
    if not log_path.exists():
        return sections
    
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Preserve AI Notes / Memory
        if "## 📝 AI Notes / Memory" in content:
            notes_block = content.split("## 📝 AI Notes / Memory")[1]
            if "---" in notes_block:
                sections["notes"] = notes_block.split("---")[0].strip() + "\n"
            else:
                sections["notes"] = notes_block.strip() + "\n"
        
        # Preserve Issues & Fixes Log
        if "## 🔧 Issues & Fixes Log" in content:
            issues_block = content.split("## 🔧 Issues & Fixes Log")[1]
            if "---" in issues_block:
                sections["issues"] = issues_block.split("---")[0].strip() + "\n"
        
        # Preserve Outstanding Global Tasks
        if "## 🔥 Outstanding" in content:
            out_block = content.split("## 🔥 Outstanding")[1]
            # Re-add the header prefix that was split off
            if "---" in out_block:
                sections["outstanding"] = out_block.split("---")[0].strip() + "\n"
            else:
                sections["outstanding"] = out_block.strip() + "\n"
    except Exception:
        pass
    
    return sections


def write_clip_log(project_name):
    """
    Auto-generates a rich CLIP_LOG.md in the project's raw folder on V: Drive.
    Includes: Dashboard, AI Notes, Issues Log, Outstanding Tasks, Architecture.
    Preserves manually-written sections on re-generation.
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
    channel = p_data.get("channel", "")
    created = p_data.get("created", "")
    
    log_path = raw_folder / "CLIP_LOG.md"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Status icon
    if status == "done":
        status_icon = "✅ Done"
    elif status == "new":
        status_icon = "🆕 New"
    else:
        status_icon = "🔄 WIP"

    # Preserve existing manual sections
    sections = _preserve_sections(log_path)
    
    # Scan snapshots for real progress
    snapshot_info = _scan_snapshots(project_name)
    
    # Scan project files
    project_files = _scan_project_files(project_name)

    # ========== BUILD CONTENT ==========
    
    # HEADER
    content = f"# {project_name} — VVE Clip Log\n"
    content += f"> Last updated: {now_str}\n"
    content += f"> Channel: {channel}\n"
    content += f"> Created: {created}\n\n"
    content += "---\n\n"
    
    # DASHBOARD TABLE
    content += "## 📊 Pipeline Progress Dashboard\n\n"
    content += f"**Current State:** {status_icon} (Step {last_step})\n\n"
    content += "| Step | Status | Description | หมายเหตุ |\n"
    content += "|------|--------|-------------|----------|\n"
    
    reached_current = False
    for s_id, s_desc in STEPS_DEFINITION:
        snap = snapshot_info.get(s_id)
        
        if s_id == last_step:
            reached_current = True
            if status == "done":
                note = f"Snapshot: {snap['versions']}v — {snap['latest_time']}" if snap else ""
                content += f"| **{s_id}** | ✅ Done | {s_desc} | {note} |\n"
            else:
                note = f"Snapshot: {snap['versions']}v — {snap['latest_time']}" if snap else ""
                content += f"| **{s_id}** | 🔄 WIP | **{s_desc}** | {note} |\n"
        elif snap:
            # Has snapshot = actually done regardless of registry order
            ver_note = f"Snapshot: {snap['versions']}v — {snap['latest_time']}" if snap['versions'] > 0 else snap['latest_time']
            content += f"| {s_id} | ✅ Done | {s_desc} | {ver_note} |\n"
        elif not reached_current and last_step != "00":
            content += f"| {s_id} | ✅ Done | {s_desc} | |\n"
        else:
            # Find the next pending step after current
            if reached_current and not any(snapshot_info.get(ns) for ns, _ in STEPS_DEFINITION[STEPS_DEFINITION.index((s_id, s_desc)):]):
                content += f"| **{s_id}** | **⏳ Next** | **{s_desc}** | **👈 ขั้นตอนถัดไป** |\n"
                reached_current = "next_marked"  # prevent marking another as next
            else:
                content += f"| {s_id} | ⏳ Pending | {s_desc} | |\n"
    
    content += "\n---\n\n"
    
    # PROJECT FILES
    if project_files:
        content += "## 📁 ไฟล์สำคัญที่ได้จาก Pipeline\n\n"
        content += "| ไฟล์ | คำอธิบาย | ขนาด |\n"
        content += "|------|---------|------|\n"
        for fname, desc, size in project_files:
            content += f"| `{fname}` | {desc} | {size} |\n"
        content += "\n---\n\n"
    
    # AI NOTES / MEMORY (preserved)
    content += "## 📝 AI Notes / Memory\n"
    content += sections["notes"] + "\n"
    content += "---\n\n"
    
    # ISSUES & FIXES LOG (preserved)
    if sections["issues"]:
        content += "## 🔧 Issues & Fixes Log\n"
        content += sections["issues"] + "\n"
        content += "---\n\n"
    else:
        content += "## 🔧 Issues & Fixes Log\n\n"
        content += "| วันที่ | ปัญหา | วิธีแก้ | สถานะ |\n"
        content += "|--------|-------|---------|-------|\n"
        content += "| — | (ยังไม่มีปัญหา) | — | — |\n\n"
        content += "---\n\n"
    
    # OUTSTANDING TASKS (preserved)
    if sections["outstanding"]:
        content += "## 🔥 Outstanding" + sections["outstanding"] + "\n"
        content += "---\n\n"
    
    # ARCHITECTURE SUMMARY
    content += "## 🏗️ Architecture Summary (สำหรับ AI แชทถัดไป)\n\n"
    content += "```\n"
    content += f"V:\\...\\Raw Clip\\{project_name}\\        ← โฟลเดอร์หลัก (V: Drive)\n"
    content += f"  ├── CLIP_LOG.md                       ← ไฟล์นี้ (Memory)\n"
    content += f"  └── _vve_backup\\                      ← Auto-backup\n"
    content += f"\n"
    content += f"CapCut: C:\\...\\com.lveditor.draft\\{project_name}\\\n"
    content += f"  ├── draft_content.json                ← CapCut Timeline\n"
    content += f"  ├── .snapshots\\                       ← Pipeline snapshots\n"
    content += f"  └── (AI output files)\n"
    content += f"\n"
    content += f"VVE Root: C:\\My Claw\\MyProjects\\Viral VDO Editing (VVE)\\\n"
    content += f"  ├── All Raw Clips\\                    ← Symlink → V:\\...\\Raw Clip\\\n"
    content += f"  ├── vve_registry.json                 ← Registry\n"
    content += f"  └── scripts\\                          ← Pipeline Scripts\n"
    content += "```\n"
    
    try:
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(content)
    except Exception as e:
        print(f"⚠️ Failed to write CLIP_LOG.md: {e}")
