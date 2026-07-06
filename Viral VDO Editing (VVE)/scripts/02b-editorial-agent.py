import os
import sys
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Attempt to load OpenAI
try:
    from openai import OpenAI
    client = OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY", "dummy-key-if-using-local"),
        base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
    )
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

SYSTEM_PROMPT = """คุณคือ Editorial Director ผู้เชี่ยวชาญตัดต่อวิดีโอไวรัล TikTok
วิเคราะห์ transcript ของวิดีโอต่อไปนี้ แล้วตัดสินใจแบบมืออาชีพ:
1. cut: ส่วนไหนควรตัดออก (พูดซ้ำ, ไม่จำเป็น, เสียงเงียบยาวเกินไป)
2. speed: ส่วนไหนควรเร่ง (speed 1.2-1.5x) เพราะพูดช้าเกินไปน่าเบื่อ
3. broll: ส่วนไหนควรใส่ B-Roll (เปลี่ยนภาพเสริมเนื้อหา) พร้อมระบุ keyword สั้นๆ ว่าภาพควรเป็นอะไร
4. bgm_change: จุดไหนควรเปลี่ยน BGM (เปลี่ยนอารมณ์, เริ่มเข้าเนื้อหา)
5. sfx: จุดไหนควรใส่ SFX (เช่น เน้นคำ, เปลี่ยนฉาก) ระบุ type (whoosh, pop, impact)

รวมถึงระบุ:
- turning_point: วินาทีที่เป็นจุดเปลี่ยนเข้าสู่เนื้อหาสำคัญที่สุด (จุด climax หรือเริ่มเล่า hook จบ)
- summary: สรุปคลิปสั้นๆ

ตอบกลับเป็น JSON format เท่านั้น โดยมีโครงสร้างดังนี้:
{
  "rough_cut": [
    {"action": "cut", "start": 1.2, "end": 2.0, "reason": "พูดซ้ำ"},
    {"action": "speed", "start": 5.0, "end": 8.0, "speed": 1.3, "reason": "พูดช้า"},
    {"action": "broll", "start": 10.0, "end": 14.0, "keyword": "วิตามิน", "reason": "อธิบายสรรพคุณ"},
    {"action": "bgm_change", "start": 12.0, "reason": "เข้าเนื้อหา"},
    {"action": "sfx", "start": 10.0, "type": "whoosh", "reason": "ภาพ broll ขึ้น"}
  ],
  "turning_point": 12.0,
  "summary": "คลิปความรู้เกี่ยวกับ..."
}
"""

def generate_editorial_decisions(transcript_path: str, output_path: str):
    if not HAS_OPENAI:
        print("Error: openai library not installed. pip install openai")
        sys.exit(1)
        
    with open(transcript_path, 'r', encoding='utf-8') as f:
        transcript_data = json.load(f)
        
    # Build text representation for LLM
    text_content = []
    for seg in transcript_data.get('segments', []):
        text_content.append(f"[{seg['start']:.1f} - {seg['end']:.1f}] {seg['text']}")
        
    full_transcript_text = "\n".join(text_content)
    
    print("Calling LLM for Editorial Decisions...")
    try:
        response = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Transcript:\n{full_transcript_text}"}
            ],
            temperature=0.3
        )
        
        result_json = response.choices[0].message.content
        result_dict = json.loads(result_json)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result_dict, f, ensure_ascii=False, indent=2)
            
        print(f"Success! Editorial decisions saved to {output_path}")
        print(f"Summary: {result_dict.get('summary')}")
        print(f"Turning Point: {result_dict.get('turning_point')}s")
        print(f"Total Decisions: {len(result_dict.get('rough_cut', []))}")
        
    except Exception as e:
        print(f"⚠️ LLM API Error: {e}")
        print("Skipping editorial decisions — pipeline will continue without them.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create Editorial Decisions via LLM")
    parser.add_argument("job_dir", type=str, help="Path to the job directory")
    args = parser.parse_args()
    
    job_dir = Path(args.job_dir)
    
    # Find transcript file (02-transcribe.py outputs *.transcript.json)
    transcript_files = list(job_dir.glob("*.transcript.json"))
    if not transcript_files:
        # Fallback: check intermediates or legacy name
        transcript_files = list(job_dir.glob("transcript_result.json"))
    
    inter_path = job_dir / "intermediates"
    inter_path.mkdir(exist_ok=True)
    out_path = inter_path / "editorial_decisions.json"
    
    if not HAS_OPENAI:
        print("⚠️ openai library not installed — skipping editorial agent. (pip install openai)")
        sys.exit(0)  # exit 0 so pipeline continues
    
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key or api_key == "dummy-key-if-using-local":
        print("⚠️ OPENAI_API_KEY not set — skipping editorial agent.")
        sys.exit(0)  # exit 0 so pipeline continues
    
    if transcript_files:
        generate_editorial_decisions(str(transcript_files[0]), str(out_path))
    else:
        print(f"⚠️ No transcript file found in {job_dir} — skipping editorial agent.")
        # exit 0 so pipeline doesn't crash

