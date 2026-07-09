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

MERGE_GAP_THRESHOLD = 0.5  # seconds — if gap between 2 kept words < this, merge into 1 region

def sec_to_us(seconds):
    return int(round(seconds * 1_000_000))

def us_to_sec(microseconds):
    return microseconds / 1_000_000.0

def parse_word_ranges(range_list):
    """
    Parse a list of word range strings into a set of word indices.
    e.g. ["W002-W005", "W007", "W010-W015"] -> {2, 3, 4, 5, 7, 10, 11, 12, 13, 14, 15}
    """
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
    """
    Given a sorted list of word indices and the words array,
    build merged keep_regions by combining adjacent words
    whose gap is < MERGE_GAP_THRESHOLD, then apply safe padding.
    """
    if not word_indices:
        return []
    
    # 1. Gather raw blocks of words
    raw_blocks = []
    current_block_start_idx = word_indices[0]
    current_block_end_idx = word_indices[0]
    
    for i in range(1, len(word_indices)):
        prev_idx = word_indices[i - 1]
        curr_idx = word_indices[i]
        
        gap = words[curr_idx]["start"] - words[current_block_end_idx]["end"]
        # We only merge words if they are strictly consecutive in the keep list!
        # If words were skipped (curr_idx != prev_idx + 1), it means there's a bad take in between, 
        # so we MUST break the block, regardless of the time gap.
        if curr_idx == prev_idx + 1 and gap < MERGE_GAP_THRESHOLD:
            current_block_end_idx = curr_idx
        else:
            raw_blocks.append((current_block_start_idx, current_block_end_idx))
            current_block_start_idx = curr_idx
            current_block_end_idx = curr_idx
            
    raw_blocks.append((current_block_start_idx, current_block_end_idx))
    
    # 2. Apply Dynamic Padding with Collision Detection
    padded_regions = []
    max_word_idx = len(words) - 1
    
    for start_idx, end_idx in raw_blocks:
        r_start = words[start_idx]["start"]
        r_end = words[end_idx]["end"]
        
        # Calculate safe PRE_PAD (check distance to previous word, if it exists)
        safe_pre_pad = PRE_PAD
        if start_idx > 0:
            prev_word_end = words[start_idx - 1]["end"]
            gap_to_prev = r_start - prev_word_end
            if gap_to_prev > 0:
                safe_pre_pad = min(PRE_PAD, gap_to_prev / 2.0)
        
        # Calculate safe POST_PAD (check distance to next word, if it exists)
        safe_post_pad = POST_PAD
        if end_idx < max_word_idx:
            next_word_start = words[end_idx + 1]["start"]
            gap_to_next = next_word_start - r_end
            if gap_to_next > 0:
                safe_post_pad = min(POST_PAD, gap_to_next / 2.0)
        
        padded_regions.append({
            "start": max(0, r_start - safe_pre_pad),
            "end": r_end + safe_post_pad,
            "raw_start": r_start,
            "raw_end": r_end,
            "start_idx": start_idx,
            "end_idx": end_idx
        })
        
    # 3. Video Continuity Check (Iron Rule 1): Detect Micro Jump Cuts (< 1.0s)
    # This prevents Frankenstein splicing of syllables across different takes.
    for r in padded_regions:
        dur = r["end"] - r["start"]
        if dur < 1.0:
            print(f"   🚨 VIDEO CONTINUITY WARNING: Micro-clip detected ({dur:.2f}s) at {r['start']:.2f}s!")
            print(f"      (Iron Rule 1 Violation? Avoid Frankenstein Splicing by selecting a complete shot.)")
            
    # 4. Merge any overlapping padded regions
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
    """Find the main video track (first track with video segments)."""
    tracks = draft_data.get("tracks", [])
    for track in tracks:
        track_type = track.get("type", "")
        if track_type == "video":
            segments = track.get("segments", [])
            if segments:
                return track, segments
    return None, None

def create_time_mapper(keep_regions):
    """
    Returns functions to map old timeline to new timeline
    and to check if a time falls inside kept regions.
    """
    def is_kept(t):
        for s, e in keep_regions:
            if s <= t <= e:
                return True
        return False

    def map_time(t):
        new_t = 0.0
        for s, e in keep_regions:
            if t < s:
                return new_t
            if t <= e:
                return new_t + (t - s)
            new_t += (e - s)
        return new_t
        
    return is_kept, map_time

def apply_editorial_cuts(job_dir: str):
    """
    Reads active_plan from editorial_decisions.json (Word-Index based).
    Resolves word indices to precise timestamps.
    Cuts the CapCut video track and shifts transcript timestamps.
    """
    try:
        job_path = Path(get_project_path(job_dir))
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
        
    decisions_path = job_path / "editorial_decisions.json"
    transcript_path = job_path / "transcript.json"
    transcript_raw_path = job_path / "transcript.raw.json"
    
    if not decisions_path.exists():
        print(f"❌ Error: {decisions_path.name} not found in {job_path}. Run 04-editorial-agent.py first.")
        sys.exit(1)
        
    # Always use raw transcript as source of truth for timestamps
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
    
    # --- Determine active plan ---
    active_plan_name = decisions.get("active_plan")
    if not active_plan_name:
        print("❌ Error: active_plan not set in editorial_decisions.json.")
        sys.exit(1)
    
    plan = decisions.get(active_plan_name)
    if not plan:
        print(f"❌ Error: Plan '{active_plan_name}' not found.")
        sys.exit(1)
    
    # --- Parse word indices from the plan ---
    keep_list = plan.get("keep", [])
    if not keep_list and active_plan_name == "rough_cut_plan" and "rough_cut_remove" in decisions:
        print("   Auto-calculating rough_cut_plan 'keep' array from 'rough_cut_remove'...")
        remove_indices = parse_word_ranges([item["words"] for item in decisions["rough_cut_remove"]])
        max_idx = len(words) - 1
        keep_list = [f"W{i:03d}" for i in range(max_idx + 1) if i not in remove_indices]
        
    if not keep_list:
        # Fallback: check if plan is a list of dicts with start/end (legacy format)
        if isinstance(plan, list) and plan and "start" in plan[0]:
            print("⚠️ Legacy format detected (start/end floats). Converting...")
            keep_regions = [(float(item["start"]), float(item["end"])) for item in plan]
        else:
            print("❌ Error: Plan has no 'keep' array.")
            sys.exit(1)
    else:
        word_indices = parse_word_ranges(keep_list)
        
        # Validate indices
        max_idx = len(words) - 1
        invalid = [i for i in word_indices if i > max_idx]
        if invalid:
            print(f"⚠️ Warning: Ignoring out-of-range indices: {invalid} (max: W{max_idx:03d})")
            word_indices = [i for i in word_indices if i <= max_idx]
        
        if not word_indices:
            print("❌ Error: No valid word indices found.")
            sys.exit(1)
        
        # --- Load CapCut Draft to get 01b boundaries ---
        try:
            project_dir = get_project_path(job_dir)
            draft_path = get_draft_path(job_dir)
        except FileNotFoundError as e:
            print(f"❌ {e}")
            sys.exit(1)
            
        draft_data = load_draft(job_dir)
        
        # Make script idempotent: Always use step_01b.json if available
        snapshot_dir = Path(project_dir) / ".snapshots"
        path_01b = snapshot_dir / "step_01b.json"
        if path_01b.exists():
            print("   Reverting to 01b timeline as base...")
            with open(path_01b, 'r', encoding='utf-8') as f:
                draft_data = json.load(f)
                
        video_track, video_segments = find_main_video_track(draft_data)
        
        if not video_track or not video_segments:
            print("❌ Error: No video track found in CapCut project.")
            sys.exit(1)
            
        # Build keep regions from word timestamps with merging and dynamic padding
        keep_regions = build_keep_regions(word_indices, words)
    
    # --- Display plan ---
    total_keep_duration = sum(e - s for s, e in keep_regions)
    print(f"▶️ Applying: {active_plan_name}")
    print(f"   Words kept: {len(word_indices) if 'word_indices' in dir() else '?'} / {len(words)}")
    print(f"   Merged into {len(keep_regions)} regions:")
    for i, (s, e) in enumerate(keep_regions):
        dur = e - s
        print(f"   Region {i+1}: {s:.2f}s -> {e:.2f}s ({dur:.1f}s)")
    print(f"   Total keep duration: {total_keep_duration:.1f}s ({total_keep_duration/60:.1f}m)")
        
    is_kept, map_time = create_time_mapper(keep_regions)
    
    # --- 1. SHIFT TRANSCRIPT TIMESTAMPS ---
    print("\n--- 1. Processing Transcript ---")
    
    # Backup original transcript if not already backed up
    if not transcript_raw_path.exists():
        shutil.copy2(transcript_path, transcript_raw_path)
        print(f"   Backed up original transcript to {transcript_raw_path.name}")
    
    # Build new words list from source transcript
    old_words = source_transcript.get("words", [])
    new_words = []
    
    for w in old_words:
        s = float(w["start"])
        e = float(w["end"])
        mid = (s + e) / 2.0
        
        # Only keep word if its midpoint falls inside a kept region
        if is_kept(mid):
            new_w = dict(w)  # shallow copy
            new_w["start"] = round(map_time(s), 3)
            new_w["end"] = round(map_time(e), 3)
            new_words.append(new_w)
            
    new_transcript = dict(source_transcript)
    new_transcript["words"] = new_words
    with open(transcript_path, "w", encoding="utf-8") as f:
        json.dump(new_transcript, f, ensure_ascii=False, indent=2)
        
    print(f"   Words kept: {len(new_words)} / {len(old_words)}")
    
    # --- 2. CUT CAPCUT PROJECT ---
    print("\n--- 2. Processing CapCut Timeline ---")

        
    new_segments = []
    timeline_cursor_us = 0
    
    # Iterate through keep regions
    for k_start, k_end in keep_regions:
        k_start_us = sec_to_us(k_start)
        k_end_us = sec_to_us(k_end)
        
        # Check every existing segment on the timeline against this keep region
        for clip in video_segments:
            clip_t_start_us = clip["target_timerange"]["start"]
            clip_t_duration_us = clip["target_timerange"]["duration"]
            clip_t_end_us = clip_t_start_us + clip_t_duration_us
            
            # --- INTELLIGENT SNAP TO VAD BOUNDARY ---
            # Whisper word timestamps are often delayed by 0.5s - 0.8s.
            # We snap to the NEAREST boundary within SNAP_US.
            SNAP_US = 300_000 # 300ms window (reduced from 800ms to avoid swallowing short bad takes)
            
            # Snap start
            snapped_k_start = k_start_us
            d_start_to_start = abs(k_start_us - clip_t_start_us)
            d_start_to_end = abs(k_start_us - clip_t_end_us)
            
            if min(d_start_to_start, d_start_to_end) < SNAP_US:
                if d_start_to_start < d_start_to_end:
                    snapped = clip_t_start_us
                else:
                    snapped = clip_t_end_us
                # Only snap if it doesn't cut into the word itself
                if snapped <= k_start_us + (PRE_PAD * 1000000):
                    snapped_k_start = snapped
                    
            # Snap end
            snapped_k_end = k_end_us
            d_end_to_end = abs(k_end_us - clip_t_end_us)
            d_end_to_start = abs(k_end_us - clip_t_start_us)
            
            if min(d_end_to_end, d_end_to_start) < SNAP_US:
                if d_end_to_end < d_end_to_start:
                    snapped = clip_t_end_us
                else:
                    snapped = clip_t_start_us
                # Only snap if it doesn't cut into the word itself
                if snapped >= k_end_us - (POST_PAD * 1000000):
                    snapped_k_end = snapped
                
            # Find overlap using snapped bounds
            o_start_us = max(clip_t_start_us, snapped_k_start)
            o_end_us = min(clip_t_end_us, snapped_k_end)
            
            # --- IGNORE TINY SLIVERS ---
            # If the overlap is less than 100ms, it's a useless sliver
            MIN_CLIP_DURATION_US = 100_000
            
            if o_start_us < o_end_us and (o_end_us - o_start_us) > MIN_CLIP_DURATION_US:
                # Overlap exists!
                trim_front_us = o_start_us - clip_t_start_us
                overlap_duration_us = o_end_us - o_start_us
                
                new_clip = copy.deepcopy(clip)
                new_clip["id"] = str(uuid.uuid4()).upper()
                
                # Adjust source
                new_clip["source_timerange"]["start"] += trim_front_us
                new_clip["source_timerange"]["duration"] = overlap_duration_us
                
                # Adjust target
                new_clip["target_timerange"]["start"] = timeline_cursor_us
                new_clip["target_timerange"]["duration"] = overlap_duration_us
                
                new_segments.append(new_clip)
                timeline_cursor_us += overlap_duration_us

    video_track["segments"] = new_segments
    draft_data["duration"] = timeline_cursor_us
    
    safe_save_draft(job_dir, draft_data, step_name="04b")
    
    new_duration_sec = us_to_sec(timeline_cursor_us)
    print("   ✅ CapCut JSON updated with", len(new_segments), "sliced segments!")
    print(f"   New total duration: {timeline_cursor_us/1e6:.1f}s ({timeline_cursor_us/1e6/60:.1f}m)")
    
    # Run Final Rendered Text Verification
    # Run verify script
    verify_script = Path(__file__).parent / "verify_timeline_text.py"
    if verify_script.exists():
        subprocess.run([sys.executable, str(verify_script), job_dir])
    
    print("\n✅ Editorial Cuts Applied Successfully!")
    print("\n⚠️  AI DOUBLE RECHECK REQUIRED:")
    print("   The AI MUST manually read the final text above multiple times.")
    print("   Hunt for: คำซ้ำ (Repeated words), คำเกิน (Extra words), คำหาย (Missing words), คำแหว่ง (Chopped words).")
    print("   Do NOT assume the text is clean. Do not proceed to 05-word-segment.py until verified.")

if __name__ == "__main__":
    if len(sys.argv) >= 2:
        project_name = sys.argv[1]
    else:
        project_name = get_active_project()
        if not project_name:
            print("Usage: python 04b-apply-editorial-cuts.py <job_dir>")
            sys.exit(1)
        print(f"📌 Using active project: {project_name}")
        
    update_step(project_name, "04b", "wip")
    apply_editorial_cuts(project_name)
    insurance_backup(project_name)
    update_step(project_name, "04b", "done")
