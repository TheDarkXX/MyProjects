"""
07b-scene-splitter.py — AI-Driven A/B-Roll Assignment
อ่าน scene_plan.json (จาก 07a) + scenes_raw.json
แล้วให้ AI ตัดสินใจว่า Scene ไหนควรเป็น A-Roll / B-Roll
โดยอิงตาม Kallaway Wave Pacing + ข้อมูลจาก scene_plan

Output: scene_table.json (พร้อม visual_type, emphasis, และ text_pop)
"""
import os
import sys
import json
import argparse
from pathlib import Path

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from utils.config_loader import load_channel_config
except ImportError:
    def load_channel_config(): return {}

SYSTEM_PROMPT = """คุณคือ AI Video Director ผู้เชี่ยวชาญตัดต่อวิดีโอไวรัล TikTok/Reels แบบเดียวกับ Kallaway

คุณจะได้รับข้อมูล 2 ชุด:
1. scenes_raw.json — รายชื่อ Scene พร้อมเวลาและบทพูด
2. scene_plan.json — ผลการวิเคราะห์ role, emphasis, value_rank, broll_function ของแต่ละ Scene (จาก 07a)

หน้าที่ของคุณ: ตัดสินใจว่าแต่ละ Scene ควรเป็น **A-Roll** (ตัวหมอพูด) หรือ **B-Roll** (ภาพประกอบ AI Generated)
โดยต้องรักษา field อื่นๆ จาก 07a (emphasis, text_pop, rehook_hint, value_rank) ไว้ตามเดิม เพื่อส่งต่อให้ระบบอื่น

กฎ Kallaway Wave Pacing:
- A-Roll = Authority: ตัวหมอพูด สร้างความน่าเชื่อถือ
- B-Roll (Proof) = ภาพหลักฐาน/ประกอบที่ตรงกับเนื้อหา
- B-Roll (Context) = ภาพบริบทเพิ่มเติม
- จังหวะที่ดี: A → B → B → A → B → B (แต่ยืดหยุ่นได้ตามเนื้อหา)

แนวทางเลือก A-Roll vs B-Roll (อิงจาก 07a):
- ถ้า 07a แนะนำ broll_function เป็น "proof" หรือ "context" → B-Roll
- role=hook (ฉากแรก) → มักเป็น A-Roll เพื่อโชว์หน้าดึงความเชื่อถือ
- role=summary หรือ rehook_hint ระบุชัดเจนว่าควรรีเซ็ตหน้าหมอ → A-Roll
- ห้าม A-Roll ติดกันเกิน 2 Scene (ผู้ชมเบื่อ)
- ห้าม B-Roll ติดกันเกิน 3 Scene (ไม่มี authority)

ตอบกลับเป็น JSON Array เท่านั้น โดยรวมข้อมูลเดิมจาก scene_plan กลับมาให้ครบ:
```json
[
  {
    "id": "S01",
    "start": 0.088,
    "end": 3.966,
    "duration": 3.878,
    "visual_type": "A-Roll (Main Clip)",
    "subtitle_text": "...",
    "emphasis": "snap_zoom_in",
    "emphasis_reason": "Hook ดึงความสนใจ",
    "text_pop": true,
    "text_pop_word": "7 อย่าง",
    "value_rank": 1,
    "rehook_hint": null
  },
  ...
]
```

visual_type ต้องเป็นหนึ่งใน:
- "A-Roll (Main Clip)"
- "B-Roll (AI Generated)"
"""

def generate_scene_split_prompt(job_dir: Path, output_md_path: str):
    """
    อ่าน scenes_raw.json + scene_plan.json แล้วสร้าง prompt ให้ AI แบ่ง A/B Roll
    """
    scenes_raw_file = job_dir / "scenes_raw.json"
    scene_plan_file = job_dir / "scene_plan.json"

    if not scenes_raw_file.exists():
        print(f"Error: scenes_raw.json not found. Run 07a first.")
        sys.exit(1)

    with open(scenes_raw_file, 'r', encoding='utf-8') as f:
        scenes_raw = json.load(f)

    scene_plan = []
    if scene_plan_file.exists():
        with open(scene_plan_file, 'r', encoding='utf-8') as f:
            scene_plan = json.load(f)
        print(f"Loaded scene_plan.json with {len(scene_plan)} entries.")
    else:
        print("Warning: scene_plan.json not found. AI will assign A/B Roll without emphasis data.")

    # Generate MD prompt
    with open(output_md_path, 'w', encoding='utf-8') as f:
        f.write("# 🎬 AI Scene Splitter Prompt (Step 07b)\n\n")
        f.write("คำสั่งสำหรับ AG IDE:\n")
        f.write("1. อ่านข้อมูล Scenes + Scene Plan ด้านล่าง\n")
        f.write("2. ตัดสินใจ A-Roll / B-Roll สำหรับแต่ละ Scene\n")
        f.write("3. เขียนผลลัพธ์ลงไฟล์ `scene_table.json` ภายในโฟลเดอร์เดียวกัน\n")
        f.write("4. ใส่ emphasis / emphasis_reason จาก scene_plan ลงไปด้วย (เฉพาะ A-Roll)\n\n")
        f.write("---\n\n")
        f.write(f"{SYSTEM_PROMPT}\n\n")
        f.write(f"## Scenes Raw ({len(scenes_raw)} scenes):\n")
        f.write("```json\n")
        json.dump(scenes_raw, f, ensure_ascii=False, indent=2)
        f.write("\n```\n\n")

        if scene_plan:
            f.write(f"## Scene Plan (from 07a):\n")
            f.write("```json\n")
            json.dump(scene_plan, f, ensure_ascii=False, indent=2)
            f.write("\n```\n")

    print(f"Generated AI prompt at {Path(output_md_path).name}")
    print("Next: AG will read this prompt and generate scene_table.json")


if __name__ == "__main__":
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
    try:
        from registry import get_active_project, update_step
        from capcut_utils import get_project_path
        from backup import insurance_backup
    except ImportError:
        print("Error: Could not import utils modules.")
        sys.exit(1)

    parser = argparse.ArgumentParser(description="07b: AI A/B-Roll Splitter")
    parser.add_argument("job_dir", nargs="?", help="Project name or job directory")
    args = parser.parse_args()

    input_arg = args.job_dir
    if not input_arg:
        input_arg = get_active_project()
        if not input_arg:
            print("Usage: python 07b-scene-splitter.py <job_dir>")
            sys.exit(1)
        print(f"Using active project: {input_arg}")

    update_step(input_arg, "07b", "wip")

    try:
        job_dir = Path(get_project_path(input_arg))
    except Exception as e:
        print(f"Error resolving project path: {e}")
        job_dir = Path(input_arg)

    out_md = str(job_dir / "scene_splitter_prompt.md")

    generate_scene_split_prompt(job_dir, out_md)
    insurance_backup(input_arg)
    update_step(input_arg, "07b", "done")
