import json
import sys
import os
from pathlib import Path

# === CONFIGURATION ===
MAX_LOOKAHEAD = 30        # Max chars to scan ahead before giving up (prevents cursor runaway)
SPEED_WARN_THRESHOLD = 25 # chars/sec — if subtitle reads faster than this, flag it as squished
SKIP_RATIO_THRESHOLD = 0.5  # If more than 50% of a line's chars are skipped, re-anchor cursor

def align_ai_text(json_path: str, text_path: str):
    """
    Aligns AI-segmented subtitle lines to exact timestamps from transcript.json.
    
    Uses a forward-scanning character matcher with a bounded lookahead window
    to prevent cursor runaway when AI text contains hallucinated extra words.
    
    Key safety features:
    1. MAX_LOOKAHEAD: Never scan more than N chars ahead per character match
    2. Per-line cursor checkpoint: If a line fails badly, restore cursor position
    3. Auto-Speed Check: Flag subtitles that are impossibly fast
    4. Spot Check Report: Sample head/mid/tail for human verification
    """
    # 1. Load exact character timestamps from transcript
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

    # 3. Match each AI line to timestamps using bounded lookahead
    groups = []
    char_idx = 0
    n = len(char_map)
    skipped_chars_total = 0
    hallucination_lines = []

    for line_num, line in enumerate(lines, 1):
        line_clean = line.replace(" ", "")
        
        match_text = line_clean
        for k, v in replacements.items():
            match_text = match_text.replace(k, v)
        
        if not match_text:
            continue
        
        # --- CHECKPOINT: Save cursor position before this line ---
        checkpoint_idx = char_idx
        
        start_time = None
        end_time = None
        matched_count = 0
        skipped_in_line = 0
        
        for ch in match_text:
            if char_idx >= n:
                skipped_in_line += 1
                continue
            
            # --- BOUNDED LOOKAHEAD (prevents cursor runaway) ---
            found = False
            for look in range(MAX_LOOKAHEAD):
                probe = char_idx + look
                if probe >= n:
                    break
                if char_map[probe]['char'] == ch:
                    char_idx = probe
                    found = True
                    break
            
            if found:
                if start_time is None:
                    start_time = char_map[char_idx]['start']
                end_time = char_map[char_idx]['end']
                matched_count += 1
                char_idx += 1
            else:
                # Character not found within lookahead window.
                # Skip this character WITHOUT advancing char_idx.
                skipped_in_line += 1
                
        # --- PER-LINE SAFETY CHECK ---
        total_chars_in_line = len(match_text)
        if total_chars_in_line > 0 and skipped_in_line / total_chars_in_line > SKIP_RATIO_THRESHOLD:
            # More than half the line was skipped — this is a hallucinated line.
            # RESTORE cursor to checkpoint so it doesn't poison subsequent lines.
            char_idx = checkpoint_idx
            skipped_chars_total += skipped_in_line
            hallucination_lines.append((line_num, line))
            print(f"   HALLUCINATION line {line_num}: '{line}' "
                  f"({skipped_in_line}/{total_chars_in_line} chars unmatched) -- cursor restored")
            # Do NOT add this line to groups (skip the entire subtitle)
            continue
        
        skipped_chars_total += skipped_in_line
        
        if start_time is not None:
            groups.append({
                "start": round(start_time, 3),
                "end": round(end_time, 3),
                "text": line
            })
            
        if skipped_in_line > 0 and skipped_in_line / total_chars_in_line <= SKIP_RATIO_THRESHOLD:
            print(f"   WARNING line {line_num}: Skipped {skipped_in_line} char(s) in: '{line}'")
    
    if skipped_chars_total > 0:
        print(f"\n   Total unmatched characters: {skipped_chars_total}")
    if hallucination_lines:
        print(f"   Hallucinated lines dropped: {len(hallucination_lines)}")
        print(f"   (AI text and transcript are out of sync -- consider re-running 05a)")

    # 4. Enforce strict zero-overlap logic
    for i in range(len(groups) - 1):
        if groups[i]["end"] >= groups[i+1]["start"]:
            min_end = groups[i]["start"] + 0.05
            groups[i]["end"] = max(min_end, groups[i+1]["start"] - 0.01)
            if groups[i]["end"] >= groups[i+1]["start"]:
                groups[i+1]["start"] = groups[i]["end"] + 0.01

    # 5. Auto-Speed Check — detect squished subtitles
    print("\n--- Auto-Speed Check ---")
    speed_warnings = 0
    for i, g in enumerate(groups):
        duration = g["end"] - g["start"]
        if duration <= 0:
            duration = 0.001  # avoid division by zero
        text_len = len(g["text"].replace(" ", ""))
        chars_per_sec = text_len / duration
        
        if chars_per_sec > SPEED_WARN_THRESHOLD:
            speed_warnings += 1
            print(f"   SQUISHED sub #{i+1}: '{g['text']}' ({duration:.2f}s, {chars_per_sec:.0f} ch/s)")
    
    if speed_warnings == 0:
        print("   All subtitles pass speed check.")
    else:
        print(f"\n   {speed_warnings} subtitle(s) flagged as too fast (>{SPEED_WARN_THRESHOLD} ch/s).")
        print(f"   These may indicate a bad take or AI text mismatch.")

    # 6. Spot Check Report — sample head / middle / tail
    print("\n--- Spot Check Report (Head / Middle / Tail) ---")
    if groups:
        sample_indices = []
        total = len(groups)
        sample_indices.append(max(0, int(total * 0.1)))      # Head: ~10%
        sample_indices.append(int(total * 0.5))               # Middle: ~50%
        sample_indices.append(min(total - 1, int(total * 0.9)))  # Tail: ~90%
        
        for idx in sample_indices:
            g = groups[idx]
            dur = g["end"] - g["start"]
            text_len = len(g["text"].replace(" ", ""))
            cps = text_len / dur if dur > 0 else 0
            label = "HEAD" if idx == sample_indices[0] else ("MID" if idx == sample_indices[1] else "TAIL")
            print(f"   [{label}] #{idx+1}/{total} | {g['start']:.2f}s - {g['end']:.2f}s ({dur:.2f}s) | {cps:.0f} ch/s")
            print(f"          Text: \"{g['text']}\"")
    else:
        print("   No subtitle groups generated!")

    # 7. Save output
    out_path = str(Path(json_path).with_suffix("")) + ".grouped.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"groups": groups}, f, ensure_ascii=False, indent=2)
        
    print(f"\nSuccess! Aligned {len(groups)} AI segmented chunks to exact timestamps. Saved to {out_path}")

if __name__ == "__main__":
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    try:
        from utils.capcut_utils import get_project_path, get_draft_path, safe_save_draft
        from utils.registry import get_active_project, update_step
    except ImportError:
        print("Error: Could not import utils modules.")
        sys.exit(1)

    if len(sys.argv) >= 2:
        job_dir = sys.argv[1]
    else:
        job_dir = get_active_project()
        if not job_dir:
            print("Usage: python 05b-align-ai.py <job_dir>")
            sys.exit(1)
        print(f"Using active project: {job_dir}")
        
    update_step(job_dir, "05b", "wip")
    
    project_dir = get_project_path(job_dir)
    json_path = os.path.join(project_dir, "transcript.json")
    
    if not os.path.exists(json_path):
        print(f"Error: No transcript.json found in {project_dir}")
        sys.exit(1)
        
    text_path = os.path.join(project_dir, "ai_segmented_latest.txt")
    
    if not os.path.exists(text_path):
        print(f"Error: ai_segmented_latest.txt not found in {project_dir}. Please run 05a-subtitle-agent.py first.")
        sys.exit(100) # PAUSE code for pipeline
        
    align_ai_text(json_path, text_path)
    update_step(job_dir, "05b", "done")
