import os
import sys
import json
import copy
import uuid
import shutil
from pathlib import Path

# Add current dir to path to import from utils/
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from utils.capcut_utils import get_project_path, get_draft_path, load_draft, safe_save_draft
except ImportError:
    print("❌ Error: utils/capcut_utils.py not found.")
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

def build_keep_regions(word_indices, words):
    """
    Given a sorted list of word indices and the words array,
    build merged keep_regions by combining adjacent words
    whose gap is < MERGE_GAP_THRESHOLD.
    """
    if not word_indices:
        return []
    
    regions = []
    # Start first region
    region_start = words[word_indices[0]]["start"]
    region_end = words[word_indices[0]]["end"]
    
    for i in range(1, len(word_indices)):
        prev_idx = word_indices[i - 1]
        curr_idx = word_indices[i]
        
        curr_word = words[curr_idx]
        gap = curr_word["start"] - region_end
        
        # Check if consecutive word indices AND gap is small enough to merge
        if curr_idx == prev_idx + 1 and gap < MERGE_GAP_THRESHOLD:
            # Merge: extend region to include this word
            region_end = curr_word["end"]
        elif gap < MERGE_GAP_THRESHOLD:
            # Non-consecutive index but very close in time — still merge
            region_end = curr_word["end"]
        else:
            # Gap too large — close current region, start new one
            regions.append((region_start, region_end))
            region_start = curr_word["start"]
            region_end = curr_word["end"]
    
    # Close last region
    regions.append((region_start, region_end))
    return regions

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
    job_path = Path(job_dir)
    decisions_path = job_path / "editorial_decisions.json"
    transcript_path = job_path / "transcript.json"
    transcript_raw_path = job_path / "transcript.raw.json"
    
    if not decisions_path.exists():
        print(f"❌ Error: {decisions_path.name} not found. Run 04-editorial-agent.py first.")
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
        
        # Build keep regions from word timestamps with merging
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
    try:
        project_dir = get_project_path(job_dir)
        draft_path = get_draft_path(job_dir)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
        
    draft_data = load_draft(job_dir)
    video_track, video_segments = find_main_video_track(draft_data)
    
    if not video_track or not video_segments:
        print("❌ Error: No video track found in CapCut project.")
        sys.exit(1)
        
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
            # If the ASR keep region is very close to a VAD clip boundary,
            # we SNAP it to the boundary. This avoids slicing mid-waveform
            # and perfectly preserves the natural breath/silence left by VAD!
            SNAP_US = 300_000 # 300ms
            INTERNAL_PAD_US = 80_000 # 80ms padding for mid-clip cuts
            
            # Snap start
            if abs(k_start_us - clip_t_start_us) < SNAP_US:
                snapped_k_start = clip_t_start_us
            elif abs(k_start_us - clip_t_end_us) < SNAP_US:
                snapped_k_start = clip_t_end_us
            else:
                snapped_k_start = k_start_us - INTERNAL_PAD_US
                
            # Snap end
            if abs(k_end_us - clip_t_end_us) < SNAP_US:
                snapped_k_end = clip_t_end_us
            elif abs(k_end_us - clip_t_start_us) < SNAP_US:
                snapped_k_end = clip_t_start_us
            else:
                snapped_k_end = k_end_us + INTERNAL_PAD_US

            # Find overlap using snapped bounds
            o_start_us = max(clip_t_start_us, snapped_k_start)
            o_end_us = min(clip_t_end_us, snapped_k_end)
            
            # --- IGNORE TINY SLIVERS ---
            # If the overlap is less than 100ms, it's a useless sliver (often caused by pad overlap)
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
    print(f"   ✅ CapCut JSON updated with {len(new_segments)} sliced segments!")
    print(f"   New total duration: {new_duration_sec:.1f}s ({new_duration_sec/60:.1f}m)")
    print(f"\n✅ Editorial Cuts Applied Successfully!")
    print(f"   💡 Next: Run 05-word-segment.py to generate subtitles.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python 04b-apply-editorial-cuts.py <job_dir>")
        sys.exit(1)
        
    apply_editorial_cuts(sys.argv[1])
