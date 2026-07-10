"""
07a-scene-analyzer.py — AI Scene Analyzer
ให้ AI อ่านบทพูดทั้งหมดจาก grouped.json แล้ววิเคราะห์:
- role, emphasis, emotional_beat, pacing
- value_rank, broll_function, text_pop, rehook_hint (Kallaway's deeper principles)

Output: scene_plan.json (สำหรับ 07b ไปใช้ต่อ)
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
วิเคราะห์ Scenes ต่อไปนี้และวางแผนจังหวะการนำเสนอให้เกิด "Controlled Volatility" (การควบคุมความผันผวนของความสนใจ)

กฎ Kallaway Wave Pacing (Controlled Volatility):
- ปรัชญาหลัก: อย่าให้คนดูรู้สึกนิ่ง ต้องเปลี่ยน State ของคนดูทุกๆ 3-5 วินาที
- จังหวะ (Wave): Authority (A-Roll หมอพูดเพื่อดึง Trust) → Proof (B-Roll โชว์หลักฐาน) → Context (B-Roll เล่าบริบท) → Rehook (ดึงกลับมา A-Roll)
- การสลับ A-Roll / B-Roll ต้องล้อไปกับจังหวะของเนื้อหา (Script's Rhythm) ไม่ใช่แค่สลับกันมั่วๆ
- Value Escalation: ลำดับความว้าวของเนื้อหาควรไต่ระดับขึ้น จุดที่ 2 ต้องว้าวกว่าจุดที่ 1

กฎ Dopamine Hit & Text Pop (Micro-Punctuation):
- ทุกๆ 3-5 วินาที ต้องมีบางอย่างเกิดขึ้น (Pattern Break)
- จุดที่เป็น Contrarian (หักมุม), Reveal (เฉลย), ตัวเลข/สถิติ → ให้สั่ง emphasis "snap_zoom_in" (ฟึ้บ!)
- จุดเปลี่ยนหัวข้อ, รีเซ็ตอารมณ์, เริ่มต้นใหม่ → ให้สั่ง emphasis "snap_zoom_out" (ฟั่บ!)
- Text Pop: การเด้ง subtitle แบบกระแทกตา (Selective Intensity) ควรมีแค่ตรงจุดที่เนื้อหาหักมุม หรือเป็น Key Phrase จริงๆ เท่านั้น ห้ามเด้งพร่ำเพรื่อ

สำหรับแต่ละ Scene ให้วิเคราะห์และระบุ:
1. role: "hook", "keypoint", "proof", "transition", "summary", "filler"
2. value_rank: ลำดับความว้าวของฉากนี้เทียบกับฉากอื่น (1=น่าสนใจมาก, 2=ปานกลาง, 3=เฉยๆ)
3. emphasis: "snap_zoom_in" / "snap_zoom_out" / null
4. emphasis_reason: ทำไมถึงซูมแบบนี้
5. text_pop: (true/false) ควรมี Subtitle เด้งตัวใหญ่ไหม?
6. text_pop_word: (string/null) ถ้ามี ควรเน้นคำว่าอะไร? (เช่น "70%", "แต่ความจริงคือ")
7. broll_function: ถ้าฉากนี้ต้องใช้ B-Roll มันควรทำหน้าที่อะไร? ("proof", "reset", "compress", "emotional_color", "rehook", null)
8. rehook_hint: (string/null) ประโยค mini-hook ที่ดึงคนดูก่อนข้ามฉาก (เช่น "แต่นั่นยังไม่ใช่ทั้งหมด")
9. emotional_beat: "excitement" / "authority" / "inform" / "surprise" / "calm"
10. pacing: "fast" / "medium" / "slow"

ตอบกลับเป็น JSON Array เท่านั้น:
```json
[
  {
    "id": "S01",
    "role": "hook",
    "value_rank": 1,
    "emphasis": "snap_zoom_in",
    "emphasis_reason": "Hook ตัวเลข 7 อย่าง ดึงความสนใจ",
    "text_pop": true,
    "text_pop_word": "7 อย่าง",
    "broll_function": null,
    "rehook_hint": null,
    "emotional_beat": "excitement",
    "pacing": "fast"
  },
  ...
]
```
"""

def generate_scene_analysis_prompt(grouped_json_path: str, output_md_path: str, output_json_path: str):
    """
    อ่าน grouped.json แล้วหั่นเป็น Scene ตาม duration
    จากนั้นสร้าง prompt MD ให้ AI วิเคราะห์
    """
    path = Path(grouped_json_path)
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    config = load_channel_config()
    target_duration_sec = config.get("scene_duration_sec", 3.5)

    groups = data.get("groups", [])
    if not groups:
        print("No groups found in transcript.")
        sys.exit(0)

    # --- Chunk into Scenes (same logic as old 07) ---
    scenes = []
    current_scene_text = []
    current_scene_start = groups[0]["start"]
    current_scene_end = current_scene_start

    for group in groups:
        current_scene_text.append(group["text"])
        current_scene_end = group["end"]

        duration = current_scene_end - current_scene_start
        if duration >= target_duration_sec:
            scene_idx = len(scenes)
            scene_id = f"S{scene_idx + 1:02d}"
            scenes.append({
                "id": scene_id,
                "start": current_scene_start,
                "end": current_scene_end,
                "duration": round(duration, 3),
                "subtitle_text": "".join(current_scene_text)
            })
            current_scene_text = []
            current_scene_start = current_scene_end

    # Handle remainder
    if current_scene_text:
        scene_idx = len(scenes)
        scene_id = f"S{scene_idx + 1:02d}"
        scenes.append({
            "id": scene_id,
            "start": current_scene_start,
            "end": current_scene_end,
            "duration": round(current_scene_end - current_scene_start, 3),
            "subtitle_text": "".join(current_scene_text)
        })

    # Save raw scenes (without visual_type yet) for 07b to consume
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(scenes, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(scenes)} raw scenes to {Path(output_json_path).name}")

    # Generate MD prompt for AI
    with open(output_md_path, 'w', encoding='utf-8') as f:
        f.write("# 🎬 AI Scene Analyzer Prompt (Step 07a)\n\n")
        f.write("คำสั่งสำหรับ AG IDE:\n")
        f.write("1. อ่านข้อมูล Scenes ด้านล่าง\n")
        f.write("2. วิเคราะห์บทบาท จังหวะ และจุดเน้นของแต่ละ Scene\n")
        f.write("3. เขียนผลลัพธ์ลงไฟล์ `scene_plan.json` ภายในโฟลเดอร์เดียวกัน\n\n")
        f.write("---\n\n")
        f.write(f"{SYSTEM_PROMPT}\n\n")
        f.write(f"## Scenes ({len(scenes)} scenes):\n")
        f.write("```json\n")
        json.dump(scenes, f, ensure_ascii=False, indent=2)
        f.write("\n```\n")

    print(f"Generated AI prompt at {Path(output_md_path).name}")
    print(f"Total: {len(scenes)} scenes | Duration: {scenes[-1]['end']:.1f}s")
    print("Next: AG will read this prompt and generate scene_plan.json")


if __name__ == "__main__":
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
    try:
        from registry import get_active_project, update_step
        from capcut_utils import get_project_path
        from backup import insurance_backup
    except ImportError:
        print("Error: Could not import utils modules.")
        sys.exit(1)

    parser = argparse.ArgumentParser(description="07a: AI Scene Analyzer")
    parser.add_argument("job_dir", nargs="?", help="Project name or job directory")
    args = parser.parse_args()

    input_arg = args.job_dir
    if not input_arg:
        input_arg = get_active_project()
        if not input_arg:
            print("Usage: python 07a-scene-analyzer.py <job_dir>")
            sys.exit(1)
        print(f"Using active project: {input_arg}")

    update_step(input_arg, "07a", "wip")

    try:
        job_dir = Path(get_project_path(input_arg))
    except Exception as e:
        print(f"Error resolving project path: {e}")
        job_dir = Path(input_arg)

    json_files = list(job_dir.glob("*.grouped.json"))
    if not json_files:
        print(f"Error: No .grouped.json found in {job_dir}")
        sys.exit(1)

    json_path = str(json_files[0])
    out_md = str(job_dir / "scene_analyzer_prompt.md")
    out_scenes = str(job_dir / "scenes_raw.json")

    generate_scene_analysis_prompt(json_path, out_md, out_scenes)
    insurance_backup(input_arg)
    update_step(input_arg, "07a", "done")
