import json
import sys
import os
from pathlib import Path

def align_ai_text(json_path: str, text_path: str):
    # 1. Load exact character timestamps
    data = json.loads(Path(json_path).read_text(encoding="utf-8"))
    raw_chars = data.get("words", [])
    
    char_map = []
    for entry in raw_chars:
        text = entry.get("text", "")
        start = float(entry.get("start", 0.0))
        end = float(entry.get("end", start))
        for ch in text:
            if not ch.isspace():
                char_map.append({'char': ch, 'start': start, 'end': end})

    # 2. Load AI Segmented Lines
    lines = [line.strip() for line in Path(text_path).read_text(encoding="utf-8").splitlines() if line.strip()]

    groups = []
    char_idx = 0
    n = len(char_map)

    # Load replacements if any
    replacements = {}
    job_dir = os.path.dirname(text_path)
    rep_file = os.path.join(job_dir, "replacements.json")
    if os.path.exists(rep_file):
        try:
            with open(rep_file, "r", encoding="utf-8") as f:
                replacements = json.load(f)
        except Exception as e:
            print(f"Warning: Failed to load replacements.json: {e}")

    for line in lines:
        line_clean = line.replace(" ", "")
        
        match_text = line_clean
        for k, v in replacements.items():
            match_text = match_text.replace(k, v)
        
        if not match_text: continue
        
        start_time = None
        end_time = None
        
        matched_chars = ""
        for ch in match_text:
            if char_idx >= n:
                print(f"WARNING: Ran out of characters in JSON while trying to match '{ch}' in '{line}'")
                break
                
            # Skip any mismatches (shouldn't happen if texts match perfectly)
            while char_idx < n and char_map[char_idx]['char'] != ch:
                char_idx += 1
                
            if char_idx < n:
                if start_time is None:
                    start_time = char_map[char_idx]['start']
                end_time = char_map[char_idx]['end']
                matched_chars += ch
                char_idx += 1
                
        if start_time is not None:
            groups.append({
                "start": round(start_time, 3),
                "end": round(end_time, 3),
                "text": line
            })

    # 3. Enforce strict zero-overlap logic
    for i in range(len(groups) - 1):
        if groups[i]["end"] >= groups[i+1]["start"]:
            min_end = groups[i]["start"] + 0.05
            groups[i]["end"] = max(min_end, groups[i+1]["start"] - 0.01)
            if groups[i]["end"] >= groups[i+1]["start"]:
                groups[i+1]["start"] = groups[i]["end"] + 0.01

    out_path = str(Path(json_path).with_suffix("")) + ".grouped.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"groups": groups}, f, ensure_ascii=False, indent=2)
        
    print(f"Success! Aligned {len(groups)} AI segmented chunks to exact timestamps. Saved to {out_path}")

if __name__ == "__main__":
    try:
        from capcut_utils import get_project_path, get_draft_path, safe_save_draft
        from registry import get_active_project, update_step
    except ImportError:
        print("❌ Error: Could not import utils modules.")
        sys.exit(1)

    if len(sys.argv) >= 2:
        job_dir = sys.argv[1]
    else:
        job_dir = get_active_project()
        if not job_dir:
            print("Usage: python 05b-align-ai.py <job_dir>")
            sys.exit(1)
        print(f"📌 Using active project: {job_dir}")
        
    update_step(job_dir, "05b", "wip")
    
    project_dir = get_project_path(job_dir)
    json_path = os.path.join(project_dir, "transcript.json")
    
    if not os.path.exists(json_path):
        print(f"❌ Error: No transcript.json found in {project_dir}")
        sys.exit(1)
        
    text_path = os.path.join(project_dir, "ai_segmented_latest.txt")
    
    if not os.path.exists(text_path):
        print(f"❌ Error: ai_segmented_latest.txt not found in {project_dir}. Please run 05a-subtitle-agent.py first.")
        sys.exit(100) # PAUSE code for pipeline
        
    align_ai_text(json_path, text_path)
    update_step(job_dir, "05b", "done")
