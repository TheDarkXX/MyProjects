import os
import sys
import json
import argparse
from pathlib import Path

SYSTEM_PROMPT = """คุณคือ Editorial Director ผู้เชี่ยวชาญตัดต่อวิดีโอไวรัล TikTok
วิเคราะห์ transcript (ที่แปะ Word Index W000, W001, ... ไว้แล้ว) ของวิดีโอต่อไปนี้

กฎสำคัญ:
- ตอบกลับโดยอ้างอิง **Word Index (Wxxx)** เท่านั้น ห้ามพิมพ์ตัวเลขเวลาเอง
- ใช้ format "Wxxx-Wyyy" สำหรับช่วงต่อเนื่อง หรือ "Wxxx" สำหรับคำเดียว
- ระบบจะดึงเวลา start/end ที่แม่นยำระดับมิลลิวินาทีจาก transcript อัตโนมัติ

1. rough_cut_remove: กวาดล้าง "เทคเสีย" และ "คำพูดซ้ำ" **ทั้งหมด** อย่างไร้ความปรานี! (ระบุ Word Index ที่ควรตัดออก พร้อมเหตุผล)
   - หากผู้พูดพูดผิด แล้วพูดใหม่ ให้ตัดท่อนที่พูดผิดทิ้งทันที
   - หากมีการพูดคำเดิมซ้ำๆ (เช่น "ช่วยลด ช่วยลด", "และมีสาร และมีสาร") ให้ตัดท่อนที่ซ้ำออกให้เหลือแค่รอบเดียวที่สมบูรณ์ที่สุด
   - ตัดคำขยะ (เอ่อ, อ่า, โอเค, นะครับ, แบบว่า) ที่ไม่จำเป็นทิ้งทั้งหมด
   - ⚠️ การมีคำพูดซ้ำหลุดรอดไปถือเป็นความผิดพลาดร้ายแรงของ AI! จงอ่านทีละประโยคอย่างละเอียด!
2. เสนอแผนตัดต่อ 4 ระดับ โดยระบุ Word Index ที่จะ **เก็บไว้** (keep):
   - rough_cut_plan: แผนตัดแค่เทคเสีย (เก็บหมดที่เหลือ) เหมาะสำหรับคลิปที่เนื้อหาดีอยู่แล้ว
   - keypoint_cut_plan: แผนกระชับ (ประมาณ 90-180s) คงเนื้อหาสำคัญและรายละเอียดบางส่วน
   - essential_cut_plan: แผนสั้นที่สุด (ประมาณ 60-90s) คง Keypoint หลักที่ขาดไม่ได้
   - viral_cut_plan: แผนสั้นสุดขีด เน้น Hook + Climax
3. retention_report: ประเมินเปอร์เซ็นต์ข้อมูลที่ยังคงอยู่ใน 3 ด้าน:
   keypoints (หัวข้อสำคัญ), research_data (งานวิจัย/สถิติ), examples (ตัวอย่าง/เรื่องเล่า)

ตอบกลับเป็น JSON format เท่านั้น:
```json
{
  "rough_cut_remove": [
    {"words": "W000-W001", "reason": "พูดซ้ำ hook 2 รอบ"},
    {"words": "W006", "reason": "คำว่า โอเค ไม่จำเป็น"}
  ],
  "rough_cut_plan": {
    "keep": ["W002-W005", "W007-W035"],
    "notes": ["ตัดแค่เทคเสีย", "เก็บเนื้อหาครบ 100%"]
  },
  "keypoint_cut_plan": {
    "keep": ["W002-W005", "W007", "W010-W015", "W031-W035"],
    "notes": ["Hook + Intro", "งานวิจัย", "เนื้อหาสำคัญ", "สรุป"]
  },
  "essential_cut_plan": {
    "keep": ["W002-W005", "W010-W012", "W031-W033"],
    "notes": ["Hook", "Keypoint หลัก", "CTA"]
  },
  "viral_cut_plan": {
    "keep": ["W002-W003", "W031"],
    "notes": ["Hook ดึงดูด", "ท่อนพีค"]
  },
  "retention_report": {
    "rough_cut_plan": {"keypoints": "100%", "research_data": "100%", "examples": "100%"},
    "keypoint_cut_plan": {"keypoints": "100%", "research_data": "80%", "examples": "50%"},
    "essential_cut_plan": {"keypoints": "100%", "research_data": "20%", "examples": "0%"},
    "viral_cut_plan": {"keypoints": "15%", "research_data": "10%", "examples": "0%"}
  },
  "summary": "คลิปความรู้เกี่ยวกับ..."
}
```
"""

def generate_editorial_prompt(transcript_path: str, output_md_path: str):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        transcript_data = json.load(f)
        
    items = transcript_data.get('words', transcript_data.get('segments', []))
    
    # Build indexed transcript lines
    text_lines = []
    total_duration = 0
    for i, seg in enumerate(items):
        s = seg.get('start', 0)
        e = seg.get('end', 0)
        t = seg.get('text', '')
        dur = e - s
        text_lines.append(f"W{i:03d} [{s:.2f}-{e:.2f}] ({dur:.1f}s) {t}")
        total_duration = max(total_duration, e)
    
    full_transcript_text = "\n".join(text_lines)
    
    with open(output_md_path, 'w', encoding='utf-8') as f:
        f.write("# 🎬 AI Editorial Agent Prompt\n\n")
        f.write("คำสั่งสำหรับ AG IDE: กรุณาอ่านข้อมูล Transcript ด้านล่าง และคืนค่าเป็นไฟล์ editorial_decisions.json ภายในโฟลเดอร์นี้ทันที\n")
        f.write("และเมื่อเขียนไฟล์เสร็จแล้ว ให้แสดงรายงานสรุป (Editorial Report) พร้อมคะแนน Retention Score ออกมาในแชท\n")
        f.write("หลังจากนั้นให้ใช้เครื่องมือ `ask_question` ให้ตัวเลือกผู้ใช้เลือกแผนการตัดต่อที่ต้องการนำไปใช้ในขั้นตอนต่อไป\n\n")
        f.write("---\n\n")
        f.write(f"{SYSTEM_PROMPT}\n\n")
        f.write(f"## Transcript ({len(items)} words, {total_duration:.1f}s total):\n")
        f.write("```text\n")
        f.write(full_transcript_text)
        f.write("\n```\n")
        
    print(f"✅ Success! สร้างไฟล์ Prompt สำหรับ AG IDE เสร็จแล้วที่: {output_md_path}")
    print(f"   📊 Words: {len(items)} | Duration: {total_duration:.1f}s")
    print("🤖 AG IDE: Please read the file above and generate editorial_decisions.json automatically.")
    print("🤖 AG IDE: After generating the JSON, present the Markdown Editorial Report and use the `ask_question` tool.")
    print("🤖 AG IDE: (ในตัวเลือกให้โชว์เวลาเป็นทั้งวินาทีและนาที เช่น 144.9s (2.4m) เพื่อให้ดูง่าย)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create Editorial Prompt for AG IDE")
    parser.add_argument("project_name", type=str, help="CapCut project name or path")
    args = parser.parse_args()
    
    # Add utils to path so we can import capcut_utils
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
    try:
        from capcut_utils import get_project_path
    except ImportError:
        print("❌ Error: Could not import capcut_utils. Run from scripts directory.")
        sys.exit(1)
        
    try:
        project_dir = Path(get_project_path(args.project_name))
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
    
    # Use raw transcript if available (original, uncut)
    raw_transcript = project_dir / "transcript.raw.json"
    transcript = project_dir / "transcript.json"
    
    if raw_transcript.exists():
        source = raw_transcript
    elif transcript.exists():
        source = transcript
    else:
        print(f"⚠️ No transcript file found in {project_dir} — skipping editorial prompt.")
        sys.exit(1)
    
    out_path = project_dir / "editorial_prompt.md"
    generate_editorial_prompt(str(source), str(out_path))
