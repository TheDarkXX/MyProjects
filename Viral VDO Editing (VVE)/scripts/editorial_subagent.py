import os
import json
import argparse

def create_editorial_cut(transcript_path: str, output_path: str = "editorial_result.json"):
    if not os.path.exists(transcript_path):
        raise FileNotFoundError(f"Transcript not found: {transcript_path}")
        
    with open(transcript_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    subtitles = []
    brolls = []
    sfx = []
    
    # Simple Keyword mapping for B-roll and SFX (simulating AI understanding)
    broll_keywords = {
        "หมอ": "C:/My Claw/MyProjects/Viral VDO Editing (VVE)/assets/brolls/doctor.mp4",
        "สุขภาพ": "C:/My Claw/MyProjects/Viral VDO Editing (VVE)/assets/brolls/health.mp4",
        "เงิน": "C:/My Claw/MyProjects/Viral VDO Editing (VVE)/assets/brolls/money.mp4",
        "น้ำตาล": "C:/My Claw/MyProjects/Viral VDO Editing (VVE)/assets/brolls/sugar.mp4",
        "อาหาร": "C:/My Claw/MyProjects/Viral VDO Editing (VVE)/assets/brolls/food.mp4",
        "ตา": "C:/My Claw/MyProjects/Viral VDO Editing (VVE)/assets/brolls/eye.mp4"
    }
    
    sfx_path = "C:/My Claw/MyProjects/Viral VDO Editing (VVE)/assets/sfx/pop.mp3"
    whoosh_path = "C:/My Claw/MyProjects/Viral VDO Editing (VVE)/assets/sfx/whoosh.mp3"
    
    # Process Minnie-style grouping (2-3 words per subtitle)
    for seg in data.get('segments', []):
        seg_text = seg.get('text', '').strip()
        if not seg_text:
            continue
            
        words = seg.get('words', [])
        
        if not words:
            # Fallback for Thai: divide segment into 20-char chunks
            chunk_length = 20
            chunks = [seg_text[i:i+chunk_length] for i in range(0, len(seg_text), chunk_length)]
            time_per_chunk = (seg['end'] - seg['start']) / len(chunks) if chunks else 0
            
            for i, chunk_text in enumerate(chunks):
                start_time = seg['start'] + (i * time_per_chunk)
                end_time = start_time + time_per_chunk
                
                subtitles.append({
                    "text": chunk_text,
                    "start": start_time,
                    "end": end_time
                })
                sfx.append({
                    "path": sfx_path,
                    "start": start_time
                })
                
                for kw, bpath in broll_keywords.items():
                    if kw in chunk_text:
                        brolls.append({
                            "path": bpath,
                            "start": start_time,
                            "duration": 3.0
                        })
                        sfx.append({
                            "path": whoosh_path,
                            "start": start_time
                        })
        else:
            chunk = []
            chunk_start = 0.0
            
            for w in words:
                word_text = w['word'].strip()
                if not word_text:
                    continue
                    
                if not chunk:
                    chunk_start = w['start']
                    
                chunk.append(word_text)
                
                # Keyword detection for B-Roll and SFX
                for kw, bpath in broll_keywords.items():
                    if kw in word_text:
                        brolls.append({
                            "path": bpath,
                            "start": w['start'],
                            "duration": 3.0
                        })
                        sfx.append({
                            "path": whoosh_path,
                            "start": w['start']
                        })
                        
                # Group every 3 words or if there's a natural pause
                if len(chunk) >= 3:
                    sub_text = "".join(chunk)
                    subtitles.append({
                        "text": sub_text,
                        "start": chunk_start,
                        "end": w['end']
                    })
                    sfx.append({
                        "path": sfx_path,
                        "start": chunk_start
                    })
                    chunk = []
                    
            # Remaining words in segment
            if chunk:
                sub_text = "".join(chunk)
                subtitles.append({
                    "text": sub_text,
                    "start": chunk_start,
                    "end": words[-1]['end'] if words else chunk_start + 1.0
                })
                sfx.append({
                    "path": sfx_path,
                    "start": chunk_start
                })
            
    result = {
        "subtitles": subtitles,
        "brolls": brolls,
        "sfx": sfx
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print(f"Generated {len(subtitles)} subtitles, {len(brolls)} B-rolls, and {len(sfx)} SFX triggers.")
    print(f"Saved editorial decisions to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create Editorial Cut (Subtitles, B-Roll, SFX)")
    parser.add_argument("transcript_path", type=str, help="Path to transcript_result.json")
    args = parser.parse_args()
    
    try:
        create_editorial_cut(args.transcript_path)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
