import json
import os
import sys

def get_video_segments(draft_data):
    tracks = draft_data.get("tracks", [])
    for track in tracks:
        if track.get("type") == "video":
            segments = track.get("segments", [])
            if segments:
                return segments
    return []

def map_target_to_source(target_sec, step_01b_segments):
    """Map a target time in 01b to the original raw video source time."""
    for seg in step_01b_segments:
        t_start = seg.get("target_timerange", {}).get("start", 0) / 1000000.0
        t_dur = seg.get("target_timerange", {}).get("duration", 0) / 1000000.0
        t_end = t_start + t_dur
        
        if t_start <= target_sec <= t_end:
            offset = target_sec - t_start
            s_start = seg.get("source_timerange", {}).get("start", 0) / 1000000.0
            return s_start + offset
            
    # If it falls in a gap (shouldn't happen with VAD words), just return nearest
    return None

def verify(project_input):
    from utils.capcut_utils import get_project_path, load_draft
    project_dir = get_project_path(project_input)
    
    # 1. Load baseline draft to map target->source
    snapshot_dir = os.path.join(project_dir, ".snapshots")
    path_original = os.path.join(snapshot_dir, "step_original.json")
    path_01b = os.path.join(snapshot_dir, "step_01b.json")
    
    baseline_path = path_original if os.path.exists(path_original) else path_01b
    if not os.path.exists(baseline_path):
        print(f"Error: {baseline_path} not found")
        sys.exit(1)
        
    with open(baseline_path, 'r', encoding='utf-8') as f:
        draft_baseline = json.load(f)
    segments_baseline = get_video_segments(draft_baseline)
    
    # 2. Load final draft
    final_draft = load_draft(project_input)
    final_segments = get_video_segments(final_draft)
    
    # 3. Load transcript (must use raw transcript because transcript.json is shifted)
    transcript_raw_path = os.path.join(project_dir, "transcript.raw.json")
    transcript_path = os.path.join(project_dir, "transcript.json")
    
    source_transcript_path = transcript_raw_path if os.path.exists(transcript_raw_path) else transcript_path
    with open(source_transcript_path, 'r', encoding='utf-8') as f:
        transcript_data = json.load(f)
        
    words = transcript_data.get("words", [])
    
    rendered_text = []
    dropped_words = 0
    
    for w in words:
        w_start_target = w.get("start", 0)
        w_end_target = w.get("end", 0)
        w_mid_target = (w_start_target + w_end_target) / 2.0
        
        # Map to source time
        w_mid_source = map_target_to_source(w_mid_target, segments_baseline)
        
        if w_mid_source is None:
            dropped_words += 1
            continue
            
        # Check if this source time exists in final segments
        is_kept = False

        for seg in final_segments:
            s_start = seg.get("source_timerange", {}).get("start", 0) / 1000000.0
            s_dur = seg.get("source_timerange", {}).get("duration", 0) / 1000000.0
            s_end = s_start + s_dur
            
            if s_start <= w_mid_source <= s_end:
                is_kept = True
                break
                
        if is_kept:
            rendered_text.append(w.get("text", ""))
        else:
            dropped_words += 1
            
    # For Thai, we join everything without spaces. But to make it more human readable,
    # we can add spaces after certain keywords or punctuation, though for now a continuous 
    # string is standard Thai writing.
    final_string = "".join(rendered_text)
    
    # Iron Rule 3: Human-Readable Script Verification
    # (Optional: Add custom regex spacing here if needed for readability, but continuous Thai is acceptable if not fragmented).
    
    report = "\n--- 🔍 FINAL RENDERED TEXT VERIFICATION ---\n"
    report += f"   Total video segments in final timeline: {len(final_segments)}\n\n"
    report += "✅ ACTUAL RENDERED SCRIPT (Based strictly on CapCut final segments):\n"
    report += "📝 (Iron Rule 3: Human-Readable Format)\n"
    report += final_string + "\n\n"
    
    if dropped_words > 0:
        report += f"⚠️ WARNING: {dropped_words} mapped words were DROPPED from the final timeline!\n"
    else:
        report += "✅ ALL words mapped perfectly!\n"
        
    print(report)
    
    out_file = os.path.join(project_dir, "final_rendered_text.txt")
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(report)

if __name__ == "__main__":
    verify(sys.argv[1] if len(sys.argv) > 1 else "Test Auto")
