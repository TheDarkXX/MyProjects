import json
import sys
from pathlib import Path
from typing import List, Tuple, Dict
from pythainlp.tokenize import word_tokenize

def segment_and_group(raw_json_path: str):
    data = json.loads(Path(raw_json_path).read_text(encoding="utf-8"))
    raw_chars = data.get("words", [])
    
    if not raw_chars:
        print("No words found in JSON.")
        return []

    full_text = ""
    char_map: List[Tuple[float, float]] = []
    
    for entry in raw_chars:
        text = entry.get("text", "")
        start = float(entry.get("start", 0.0))
        end = float(entry.get("end", start))
        for ch in text:
            full_text += ch
            char_map.append((start, end))

    try:
        words = word_tokenize(full_text, engine="nlpo3", keep_whitespace=False)
    except Exception as e:
        print(f"Fallback to newmm (nlpo3 failed): {e}")
        words = word_tokenize(full_text, engine="newmm", keep_whitespace=False)
        
    words = [w for w in words if w and not w.isspace()]

    aligned_words: List[Dict] = []
    char_idx = 0
    n = len(char_map)

    for w in words:
        while char_idx < n and full_text[char_idx].isspace():
            char_idx += 1
        if char_idx >= n:
            break

        word_start = char_map[char_idx][0]
        matched = 0
        last_char_end = word_start
        target_len = len(w)
        
        while matched < target_len and char_idx < n:
            if full_text[char_idx] == w[matched]:
                last_char_end = char_map[char_idx][1]
                matched += 1
            char_idx += 1

        if w == "ๆ" and aligned_words:
            aligned_words[-1]["text"] += "ๆ"
            aligned_words[-1]["end"] = round(last_char_end, 3)
            continue

        aligned_words.append({
            "start": round(word_start, 3),
            "end": round(last_char_end, 3),
            "text": w,
        })

    try:
        from utils.config_loader import load_channel_config, get_style
        config = load_channel_config()
    except ImportError:
        config = {}
        def get_style(c, s, k, d): return d
        
    preset = get_style(config, "subtitle", "preset", "drb")
    
    # DRB STYLE MASTER PROMPT RULES
    START_NEW_LINE_WORDS = {'แต่', 'และ', 'หรือ', 'เพราะ', 'ซึ่ง', 'ที่', 'จน', 'เพื่อ', 'เหมือน', 'ดั่ง', 'ราวกับ', 'คือ', 'ถ้า'}
    NEVER_END_LINE_WORDS = {'แต่', 'และ', 'หรือ', 'เพราะ', 'ที่', 'ซึ่ง', 'ของ', 'ใน', 'กับ', 'จาก', 'สู่', 'บน', 'ล่าง', 'เหมือน', 'คือ', 'ให้', 'ความ', 'การ'}

    groups = []
    current_chunk = []
    
    def flush_chunk(chunk):
        return {
            "start": chunk[0]["start"],
            "end": chunk[-1]["end"],
            "text": "".join(cw["text"] for cw in chunk)
        }

    if preset == "drb":
        for i, w in enumerate(aligned_words):
            word_text = w["text"]
            
            if not current_chunk:
                current_chunk.append(w)
                continue
                
            current_char_count = sum(len(cw["text"]) for cw in current_chunk)
            should_break = False
            
            if word_text in START_NEW_LINE_WORDS:
                should_break = True
            elif current_char_count >= 10:
                should_break = True
                
            last_word = current_chunk[-1]["text"]
            if last_word in NEVER_END_LINE_WORDS:
                should_break = False
                
            if word_text.isnumeric() or word_text in {"ๆ", "วัน", "เดือน", "ปี", "คน", "บาท", "%", "แรก"}:
                should_break = False
                
            if current_char_count + len(word_text) > 20:
                should_break = True

            if should_break:
                groups.append(flush_chunk(current_chunk))
                current_chunk = [w]
            else:
                current_chunk.append(w)
    else:
        if preset == "hormozi":
            max_words = 1
            max_chars = 15
            max_pause = 0.5
        elif preset == "classic":
            max_words = 10
            max_chars = 40
            max_pause = 0.8
        else: # "flow" preset
            max_words = 3
            max_chars = 15
            max_pause = 0.3
            
        for i, w in enumerate(aligned_words):
            if not current_chunk:
                current_chunk.append(w)
                continue
                
            prev_w = current_chunk[-1]
            pause_duration = w["start"] - prev_w["end"]
            current_chars = sum(len(cw["text"]) for cw in current_chunk)
            current_word_count = len(current_chunk)
            
            should_break = False
            
            if pause_duration > max_pause:
                should_break = True
            elif current_word_count >= max_words:
                should_break = True
            elif current_chars + len(w["text"]) > max_chars:
                should_break = True
                
            if should_break:
                groups.append(flush_chunk(current_chunk))
                current_chunk = [w]
            else:
                current_chunk.append(w)

    if current_chunk:
        groups.append(flush_chunk(current_chunk))

    # Enforce strict zero-overlap logic
    for i in range(len(groups) - 1):
        if groups[i]["end"] >= groups[i+1]["start"]:
            min_end = groups[i]["start"] + 0.05
            groups[i]["end"] = max(min_end, groups[i+1]["start"] - 0.01)
            if groups[i]["end"] >= groups[i+1]["start"]:
                groups[i+1]["start"] = groups[i]["end"] + 0.01

    return groups

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python 05-word-segment.py <job_dir_or_json_path>")
        sys.exit(1)
        
    input_arg = sys.argv[1]
    
    # Support both direct JSON path and job_dir
    if input_arg.endswith('.json') and os.path.exists(input_arg):
        json_path = input_arg
    else:
        # Import here to avoid error if script used standalone
        import os
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from utils.capcut_utils import get_project_path
        project_dir = get_project_path(input_arg)
        json_path = os.path.join(project_dir, "transcript.json")
        
        if not os.path.exists(json_path):
            print(f"❌ Error: {json_path} not found.")
            sys.exit(1)

    groups = segment_and_group(json_path)
    
    # Get preset name for logging (same logic as inside function)
    try:
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from utils.config_loader import load_channel_config, get_style
        _cfg = load_channel_config()
        _preset = get_style(_cfg, "subtitle", "preset", "drb")
    except ImportError:
        _preset = "drb"
    
    out_path = str(Path(json_path).with_suffix("")) + ".grouped.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"groups": groups}, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Success! Segmented into {len(groups)} chunks using '{_preset}' preset. Saved to {out_path}")

