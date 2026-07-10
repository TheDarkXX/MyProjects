import os
import sys
import json
import copy
import uuid
import shutil
import subprocess
from pathlib import Path

# Add current dir to path to import from utils/
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from utils.capcut_utils import get_project_path, get_draft_path, load_draft, safe_save_draft
    from utils.registry import get_active_project, update_step
except ImportError:
    print("❌ Error: utils modules not found.")
    sys.exit(1)

MERGE_GAP_THRESHOLD = 0.5

def sec_to_us(seconds):
    return int(round(seconds * 1_000_000))

def us_to_sec(microseconds):
    return microseconds / 1_000_000.0

def parse_word_ranges(range_list):
    indices = set()
    for item in range_list:
        item = item.strip()
        if "-" in item:
            parts = item.split("-")
            start_idx = int(parts[0].replace("W", "").replace("w", ""))
            end_idx = int(parts[1].replace("W", "").replace("w", ""))
            for i in range(start_idx, end_idx + 1):
                indices.add(i)
        else:
            idx = int(item.replace("W", "").replace("w", ""))
            indices.add(idx)
    return sorted(indices)

PRE_PAD = 0.01
POST_PAD = 0.01

def build_keep_regions(word_indices, words):
    if not word_indices:
        return []
    
    raw_blocks = []
    current_block_start_idx = word_indices[0]
    current_block_end_idx = word_indices[0]
    
    for i in range(1, len(word_indices)):
        prev_idx = word_indices[i - 1]
        curr_idx = word_indices[i]
        
        gap = words[curr_idx]["start"] - words[current_block_end_idx]["end"]
        if curr_idx == prev_idx + 1 and gap < MERGE_GAP_THRESHOLD:
            current_block_end_idx = curr_idx
        else:
            raw_blocks.append((current_block_start_idx, current_block_end_idx))
            current_block_start_idx = curr_idx
            current_block_end_idx = curr_idx
            
    raw_blocks.append((current_block_start_idx, current_block_end_idx))
    
    padded_regions = []
    max_word_idx = len(words) - 1
    
    for start_idx, end_idx in raw_blocks:
        r_start = words[start_idx]["start"]
        r_end = words[end_idx]["end"]
        
        safe_pre_pad = PRE_PAD
        if start_idx > 0:
            prev_word_end = words[start_idx - 1]["end"]
            gap_to_prev = r_start - prev_word_end
            if gap_to_prev > 0:
                safe_pre_pad = min(PRE_PAD, gap_to_prev / 2.0)
        
        safe_post_pad = POST_PAD
        if end_idx < max_word_idx:
            next_word_start = words[end_idx + 1]["start"]
            gap_to_next = next_word_start - r_end
            if gap_to_next > 0:
                safe_post_pad = min(POST_PAD, gap_to_next / 2.0)
        
        padded_regions.append({
            "start": max(0, r_start - safe_pre_pad),
            "end": r_end + safe_post_pad,
        })
        
    # Micro-clip detection
    for r in padded_regions:
        dur = r["end"] - r["start"]
        if dur < 1.0:
            print(f"   🚨 VIDEO CONTINUITY WARNING: Micro-clip detected ({dur:.2f}s) at {r['start']:.2f}s!")
            
    if not padded_regions:
        return []
        
    merged_regions = [(padded_regions[0]["start"], padded_regions[0]["end"])]
    for i in range(1, len(padded_regions)):
        curr_start, curr_end = padded_regions[i]["start"], padded_regions[i]["end"]
        last_start, last_end = merged_regions[-1]
        
        if curr_start <= last_end:
            merged_regions[-1] = (last_start, max(last_end, curr_end))
        else:
            merged_regions.append((curr_start, curr_end))
            
    return merged_regions

def find_main_video_track(draft_data):
    tracks = draft_data.get("tracks", [])
    for track in tracks:
        if track.get("type", "") == "video":
            segments = track.get("segments", [])
            if segments:
                return track, segments
    return None, None

def apply_editorial_cuts(job_dir: str):
    try:
        job_path = Path(get_project_path(job_dir))
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
        
    decisions_path = job_path / "editorial_decisions.json"
    transcript_path = job_path / "transcript.json"
    transcript_raw_path = job_path / "transcript.raw.json"
    
    if not decisions_path.exists():
        print(f"❌ Error: {decisions_path.name} not found. Run 04-editorial-agent.py first.")
        sys.exit(1)
        
    source_transcript_path = transcript_raw_path if transcript_raw_path.exists() else transcript_path
    if not source_transcript_path.exists():
        print(f"❌ Error: No transcript file found.")
        sys.exit(1)
        
    with open(decisions_path, "r", encoding="utf-8") as f:
        decisions = json.load(f)
    
    with open(source_transcript_path, "r", encoding="utf-8") as f:
        source_transcript = json.load(f)
    
    words = source_transcript.get("words", [])
    if not words:
        print("❌ Error: transcript has no words.")
        sys.exit(1)
    
    active_plan_name = decisions.get("active_plan")
    plan = decisions.get(active_plan_name)
    keep_list = plan.get("keep", [])
    if not keep_list and active_plan_name == "rough_cut_plan" and "rough_cut_remove" in decisions:
        remove_indices = parse_word_ranges([item["words"] for item in decisions["rough_cut_remove"]])
        max_idx = len(words) - 1
        keep_list = [f"W{i:03d}" for i in range(max_idx + 1) if i not in remove_indices]
        
    word_indices = parse_word_ranges(keep_list)
    word_indices = [i for i in word_indices if i <= len(words) - 1]
    
    draft_data = load_draft(job_dir)
    snapshot_dir = job_path / ".snapshots"
    path_01b = snapshot_dir / "step_01b.json"
    if path_01b.exists():
        print("   Reverting to 01b timeline as base...")
        with open(path_01b, 'r', encoding='utf-8') as f:
            draft_data = json.load(f)
            
    video_track, video_segments = find_main_video_track(draft_data)
    keep_regions = build_keep_regions(word_indices, words)
    
    print(f"▶️ Applying: {active_plan_name}")
    print(f"   Words kept: {len(word_indices)} / {len(words)}")
    
    # --- 1. CUT CAPCUT PROJECT (First, to get true mapped timeline) ---
    print("\n--- 1. Processing CapCut Timeline (Building True Sync Map) ---")
    
    new_segments = []
    timeline_cursor_us = 0
    overlaps_map = []  # Stores exactly how the raw video was mapped to the CapCut timeline
    
    for k_start, k_end in keep_regions:
        k_start_us = sec_to_us(k_start)
        k_end_us = sec_to_us(k_end)
        
        for clip in video_segments:
            clip_t_start_us = clip["target_timerange"]["start"]
            clip_t_duration_us = clip["target_timerange"]["duration"]
            clip_t_end_us = clip_t_start_us + clip_t_duration_us
            
            # Snap to boundary within 300ms window
            SNAP_US = 300_000 
            
            snapped_k_start = k_start_us
            d_start_to_start = abs(k_start_us - clip_t_start_us)
            d_start_to_end = abs(k_start_us - clip_t_end_us)
            if min(d_start_to_start, d_start_to_end) < SNAP_US:
                snapped = clip_t_start_us if d_start_to_start < d_start_to_end else clip_t_end_us
                if snapped <= k_start_us + sec_to_us(PRE_PAD): snapped_k_start = snapped
                    
            snapped_k_end = k_end_us
            d_end_to_end = abs(k_end_us - clip_t_end_us)
            d_end_to_start = abs(k_end_us - clip_t_start_us)
            if min(d_end_to_end, d_end_to_start) < SNAP_US:
                snapped = clip_t_end_us if d_end_to_end < d_end_to_start else clip_t_start_us
                if snapped >= k_end_us - sec_to_us(POST_PAD): snapped_k_end = snapped
                
            o_start_us = max(clip_t_start_us, snapped_k_start)
            o_end_us = min(clip_t_end_us, snapped_k_end)
            
            MIN_CLIP_DURATION_US = 100_000
            if o_start_us < o_end_us and (o_end_us - o_start_us) > MIN_CLIP_DURATION_US:
                overlap_duration_us = o_end_us - o_start_us
                
                # Record the True Sync Map for this specific CapCut clip
                overlaps_map.append({
                    "raw_start_us": o_start_us,
                    "raw_end_us": o_end_us,
                    "target_start_us": timeline_cursor_us
                })
                
                new_clip = copy.deepcopy(clip)
                new_clip["id"] = str(uuid.uuid4()).upper()
                new_clip["source_timerange"]["start"] += (o_start_us - clip_t_start_us)
                new_clip["source_timerange"]["duration"] = overlap_duration_us
                new_clip["target_timerange"]["start"] = timeline_cursor_us
                new_clip["target_timerange"]["duration"] = overlap_duration_us
                
                new_segments.append(new_clip)
                timeline_cursor_us += overlap_duration_us

    video_track["segments"] = new_segments
    draft_data["duration"] = timeline_cursor_us
    safe_save_draft(job_dir, draft_data, step_name="04b")
    
    print("   ✅ CapCut JSON updated with", len(new_segments), "sliced segments!")
    print(f"   New total duration: {timeline_cursor_us/1e6:.1f}s")
    
    # --- 2. SHIFT TRANSCRIPT TIMESTAMPS ---
    print("\n--- 2. Processing Transcript (Frame-Perfect Sync) ---")
    
    if not transcript_raw_path.exists():
        shutil.copy2(transcript_path, transcript_raw_path)
    
    old_words = source_transcript.get("words", [])
    new_words = []
    
    for w in old_words:
        s_us = sec_to_us(float(w["start"]))
        e_us = sec_to_us(float(w["end"]))
        mid_us = (s_us + e_us) // 2
        
        # Find which CapCut video clip this word belongs to
        mapped_s_sec = None
        mapped_e_sec = None
        for idx, ov in enumerate(overlaps_map):
            if ov["raw_start_us"] <= mid_us <= ov["raw_end_us"]:
                # The word is safely inside this CapCut video clip!
                # Clamp the word boundaries so they don't bleed out of the video clip
                clamped_s_us = max(ov["raw_start_us"], s_us)
                clamped_e_us = min(ov["raw_end_us"], e_us)
                
                mapped_s_us = ov["target_start_us"] + (clamped_s_us - ov["raw_start_us"])
                mapped_e_us = ov["target_start_us"] + (clamped_e_us - ov["raw_start_us"])
                
                mapped_s_sec = us_to_sec(mapped_s_us)
                mapped_e_sec = us_to_sec(mapped_e_us)
                
                # Attach overlap data for gap filling
                w["_ov_idx"] = idx
                w["_ov_end_us"] = ov["target_start_us"] + (ov["raw_end_us"] - ov["raw_start_us"])
                break
                
        if mapped_s_sec is not None:
            new_w = dict(w)
            new_w["start"] = round(mapped_s_sec, 3)
            new_w["end"] = round(mapped_e_sec, 3)
            new_words.append(new_w)
            
    # Safe Gap Filling: Snap the last word in every clip to the absolute end of the video clip (the lowest amplitude cut)
    for i in range(len(new_words)):
        w = new_words[i]
        ov_idx = w.get("_ov_idx")
        ov_end_us = w.get("_ov_end_us")
        
        is_last_in_ov = True
        if i + 1 < len(new_words):
            next_w = new_words[i+1]
            if next_w.get("_ov_idx") == ov_idx:
                is_last_in_ov = False
                
        if is_last_in_ov and ov_end_us is not None:
            # Stretch the subtitle perfectly to the edge of the clip
            w["end"] = round(us_to_sec(ov_end_us), 3)
            
        w.pop("_ov_idx", None)
        w.pop("_ov_end_us", None)
            
    new_transcript = dict(source_transcript)
    new_transcript["words"] = new_words
    with open(transcript_path, "w", encoding="utf-8") as f:
        json.dump(new_transcript, f, ensure_ascii=False, indent=2)
        
    print(f"   Words mapped perfectly to CapCut segments: {len(new_words)} / {len(old_words)}")
    
    verify_script = Path(__file__).parent / "debug" / "verify_timeline_text.py"
    if verify_script.exists():
        subprocess.run([sys.executable, str(verify_script), job_dir])
    
    print("\n✅ Editorial Cuts & Frame-Perfect Sync Applied Successfully!")

if __name__ == "__main__":
    if len(sys.argv) >= 2:
        project_name = sys.argv[1]
    else:
        project_name = get_active_project()
    update_step(project_name, "04b", "wip")
    apply_editorial_cuts(project_name)
    update_step(project_name, "04b", "done")
