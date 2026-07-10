import os
import sys
import json
import argparse
import glob
import re
from datetime import datetime
from pathlib import Path

# Add utils to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from utils.capcut_utils import get_project_path
except ImportError:
    print("❌ Error: Could not import capcut_utils. Run from scripts directory.")
    sys.exit(1)

def get_latest_snapshot(snap_dir, prefix):
    """Finds the latest snapshot file matching prefix_vNUM_TIMESTAMP.json"""
    files = glob.glob(os.path.join(snap_dir, f"{prefix}_v*.json"))
    if not files:
        return None
        
    latest_file = None
    max_v = -1
    for f in files:
        basename = os.path.basename(f)
        match = re.search(r"_v(\d+)_", basename)
        if match:
            v = int(match.group(1))
            if v > max_v:
                max_v = v
                latest_file = f
    return latest_file

def generate_subtitle_prompt(input_arg: str):
    project_dir = get_project_path(input_arg)
    transcript_path = os.path.join(project_dir, "transcript.json")
    
    if not os.path.exists(transcript_path):
        print(f"❌ Error: Could not find transcript.json in {project_dir}.")
        sys.exit(1)
        
    with open(transcript_path, 'r', encoding='utf-8') as f:
        transcript_data = json.load(f)
        
    items = transcript_data.get('words', transcript_data.get('segments', []))
    
    # Generate continuous raw text
    raw_text = "".join([seg.get('text', '') for seg in items])
    
    # Load Master Prompt
    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    master_prompt_path = os.path.join(os.path.dirname(scripts_dir), "references", "masterprompt_subtitle_segmentation.md")
    
    # Auto-Invalidate old segmentation if transcript changed
    existing_txt_path = os.path.join(project_dir, "ai_segmented_latest.txt")
    if os.path.exists(existing_txt_path):
        with open(existing_txt_path, 'r', encoding='utf-8') as f:
            old_segmented_text = f.read()
            
        rep_file = os.path.join(project_dir, "replacements.json")
        replacements = {}
        if os.path.exists(rep_file):
            try:
                with open(rep_file, "r", encoding="utf-8") as f:
                    replacements = json.load(f)
            except:
                pass
                
        clean_old = old_segmented_text.replace(" ", "").replace("\n", "").replace("\r", "")
        for k, v in replacements.items():
            clean_old = clean_old.replace(k, v)
            
        clean_raw = raw_text.replace(" ", "")
        
        if clean_old != clean_raw:
            print("⚠️ Transcript has changed! Deleting outdated ai_segmented_latest.txt to force AI PAUSE.")
            os.remove(existing_txt_path)
        else:
            print("✅ Existing ai_segmented_latest.txt matches the current transcript. No AI pause needed.")
    
    if os.path.exists(master_prompt_path):
        with open(master_prompt_path, 'r', encoding='utf-8') as f:
            master_prompt = f.read()
    else:
        master_prompt = "Master Prompt not found at " + master_prompt_path
        
    output_md_path = os.path.join(project_dir, "ai_subtitle_prompt.md")
    
    with open(output_md_path, 'w', encoding='utf-8') as f:
        f.write("# 🎬 AI Subtitle Segmentation Agent\n\n")
        f.write("คำสั่งสำหรับ AG IDE: กรุณาอ่านข้อมูล Raw Text ด้านล่าง และจัดเรียงประโยคตาม **Master Prompt (DRB Style)** ทันที\n")
        f.write("และเมื่อจัดเสร็จแล้ว ให้เซฟผลลัพธ์เป็นไฟล์ .txt โดยตั้งชื่อแบบมี Version เช่น `ai_segmented_v1.txt`\n")
        f.write("พร้อมกับทำสำเนาบันทึกทับไฟล์ชื่อ `ai_segmented_latest.txt` ไว้ในโฟลเดอร์โปรเจกต์นี้ด้วย\n\n")
        f.write("---\n\n")
        f.write(f"{master_prompt}\n\n")
        f.write("---\n\n")
        f.write("## 📝 Clean Raw Text (Bad takes removed by 04b):\n")
        f.write(f"> {raw_text}\n\n")
        
    print(f"✅ Success! สร้างไฟล์ Prompt สำหรับ AG IDE เสร็จแล้วที่: {output_md_path}")
    print(f"   📊 Words: {len(items)}")
    print("🤖 AG IDE: Please read the file above, format the text, and generate ai_segmented_latest.txt")

if __name__ == "__main__":
    import os
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
    try:
        from registry import get_active_project, update_step
        from backup import insurance_backup
    except ImportError:
        print("❌ Error: Could not import utils modules.")
        sys.exit(1)
        
    parser = argparse.ArgumentParser(description="Generate AI Subtitle Segmentation Prompt (05a)")
    parser.add_argument("project", nargs="?", help="Project path or job name")
    args = parser.parse_args()
    
    project_name = args.project
    if not project_name:
        project_name = get_active_project()
        if not project_name:
            print("❌ Error: No active project set and no project name provided.")
            print("   Use: python scripts/cli/switch_project.py <name>")
            sys.exit(1)
        print(f"📌 Using active project: {project_name}")
        
    update_step(project_name, "05a", "wip")
    generate_subtitle_prompt(project_name)
    insurance_backup(project_name)
    update_step(project_name, "05a", "done")
