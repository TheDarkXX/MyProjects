import os
import sys
import json
import copy
import subprocess
import uuid
from pathlib import Path
import torch
import torchaudio

# Force UTF-8 output to avoid Windows console errors with emojis
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Add current dir to path to import from utils/
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from utils.config_loader import load_channel_config, get_audio
    from utils.capcut_utils import get_project_path, get_draft_path, load_draft, safe_save_draft
    from utils.registry import get_active_project, update_step
except ImportError:
    def load_channel_config(): return {}
    def get_audio(c, s, k, d): return d

# Resolve ffmpeg binary via imageio_ffmpeg (same as moviepy uses)
try:
    import imageio_ffmpeg
    FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FFMPEG_PATH = "ffmpeg"

def parse_margins(margin_str):
    """Parse '0.2s,0.4s' -> (0.2, 0.4)"""
    parts = margin_str.split(',')
    if len(parts) == 1:
        v = float(parts[0].replace('s', '').strip())
        return v, v
    start = float(parts[0].replace('s', '').strip())
    end = float(parts[1].replace('s', '').strip())
    return start, end

def merge_segments(segments, min_duration=0.1):
    """Merge overlapping segments and remove segments shorter than min_duration."""
    if not segments:
        return []
    merged = []
    current_start, current_end = segments[0]
    for start, end in segments[1:]:
        if start <= current_end:
            current_end = max(current_end, end)
        else:
            if current_end - current_start >= min_duration:
                merged.append((current_start, current_end))
            current_start, current_end = start, end
    if current_end - current_start >= min_duration:
        merged.append((current_start, current_end))
    return merged

def sec_to_us(seconds):
    """Convert seconds to microseconds (CapCut uses microseconds)."""
    return int(round(seconds * 1_000_000))

def find_capcut_project(project_name):
    """Find CapCut draft_content.json by project folder name or full path."""
    # If it's already a full path to a project folder
    p = Path(project_name)
    if p.is_dir():
        draft = p / "draft_content.json"
        if draft.exists():
            return str(draft)
    
    # Search in known CapCut project directories
    search_roots = [
        Path(os.environ.get("LOCALAPPDATA", "")) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft",
        Path(os.path.expanduser("~")) / "Movies" / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft",
    ]
    
    for root in search_roots:
        if not root.exists():
            continue
        for folder in root.iterdir():
            if folder.is_dir() and folder.name == project_name:
                draft = folder / "draft_content.json"
                if draft.exists():
                    return str(draft)
        # Also check nested Timelines folder
        for folder in root.iterdir():
            if folder.is_dir():
                draft = folder / "draft_content.json"
                if draft.exists():
                    # Check if meta.json has a matching name
                    meta = folder / "draft_meta_info"
                    if meta.exists():
                        try:
                            with open(meta, 'r', encoding='utf-8') as f:
                                meta_data = json.load(f)
                            if meta_data.get("draft_name", "") == project_name:
                                return str(draft)
                        except:
                            pass
    
    return None

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

def get_video_source_path(draft_data, material_id):
    """Get the source video file path from materials by material_id."""
    videos = draft_data.get("materials", {}).get("videos", [])
    for v in videos:
        if v.get("id") == material_id:
            return v.get("path", "")
    return ""

def run_silence_cut(project_input: str):
    """
    Main function: Detect speech with Silero VAD and split CapCut timeline segments.
    
    Args:
        project_input: CapCut project folder name, folder path, or draft_content.json path
    """
    # 1. Find the CapCut project (via capcut_utils gateway)
    try:
        project_dir = get_project_path(project_input)
        draft_path = get_draft_path(project_input)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
    
    print(f"▶️ Found CapCut project: {project_dir}")
    
    # 2. Load draft_content.json
    draft_data = load_draft(project_input)
    
    # 3. Find main video track and its segments
    video_track, video_segments = find_main_video_track(draft_data)
    if not video_track or not video_segments:
        print("❌ Error: No video track found in CapCut project.")
        sys.exit(1)
    
    # We operate on the FIRST segment (the raw video clip on timeline)
    original_segment = video_segments[0]
    material_id = original_segment.get("material_id", "")
    
    # 4. Get source video file path
    source_video = get_video_source_path(draft_data, material_id)
    if not source_video or not os.path.exists(source_video):
        print(f"❌ Error: Source video not found: {source_video}")
        sys.exit(1)
    
    print(f"   Source video: {source_video}")
    
    # Get source timerange info
    source_start_us = original_segment.get("source_timerange", {}).get("start", 0)
    source_duration_us = original_segment.get("source_timerange", {}).get("duration", 0)
    source_start_sec = source_start_us / 1_000_000.0
    source_end_sec = (source_start_us + source_duration_us) / 1_000_000.0
    
    print(f"   Source range: {source_start_sec:.2f}s - {source_end_sec:.2f}s ({source_duration_us/1_000_000:.2f}s)")
    
    # 5. Load config for margins
    config = load_channel_config()
    margin_str = get_audio(config, "silence", "margin", "0.08s,0.0s")
    margin_start, margin_end = parse_margins(margin_str)
    print(f"   Margins: pad_start={margin_start}s, pad_end={margin_end}s")
    
    # 6. Extract temp audio for VAD
    temp_wav = os.path.join(project_dir, "_vad_temp_16k.wav")
    print("   Extracting audio for VAD analysis...")
    subprocess.run([
        FFMPEG_PATH, "-y", "-i", source_video,
        "-ss", str(source_start_sec), "-t", str(source_end_sec - source_start_sec),
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        temp_wav
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    if not os.path.exists(temp_wav):
        print("❌ Error: Failed to extract audio for VAD.")
        sys.exit(1)
    
    # 7. Load Silero VAD
    print("   Loading Silero VAD model...")
    torch.set_num_threads(1)
    try:
        model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                      model='silero_vad',
                                      force_reload=False,
                                      trust_repo=True)
    except TypeError:
        model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                      model='silero_vad',
                                      force_reload=False)
    
    (get_speech_timestamps, save_audio, read_audio, VADIterator, collect_chunks) = utils
    
    # 8. Run VAD
    print("   Detecting speech segments...")
    wav = read_audio(temp_wav, sampling_rate=16000)
    speech_timestamps = get_speech_timestamps(
        wav, 
        model, 
        sampling_rate=16000,
        min_silence_duration_ms=150,  # Remove Silences Longer Than
        min_speech_duration_ms=100,   # Ignore Detections Shorter Than
        threshold=0.5                 # Standard threshold (0.3 was too sensitive and kept too much tail)
    )
    
    if not speech_timestamps:
        print("❌ Error: No speech detected! Skipping silence cut.")
        if os.path.exists(temp_wav): os.remove(temp_wav)
        sys.exit(1)
    
    # 9. Convert VAD samples → seconds (relative to extracted audio = relative to source clip)
    raw_segments = []
    for ts in speech_timestamps:
        s_sec = ts['start'] / 16000.0
        e_sec = ts['end'] / 16000.0
        padded_start = max(0.0, s_sec - margin_start)
        padded_end = min(source_end_sec - source_start_sec, e_sec + margin_end)
        raw_segments.append((padded_start, padded_end))
    
    final_segments = merge_segments(raw_segments)
    print(f"   Found {len(final_segments)} speech segments.")
    
    # 10. Build new CapCut segments from VAD results
    new_segments = []
    timeline_cursor_us = 0  # Where on the CapCut timeline each segment starts
    
    for i, (seg_start, seg_end) in enumerate(final_segments):
        seg_duration = seg_end - seg_start
        
        # Clone the original segment as a template
        new_seg = copy.deepcopy(original_segment)
        
        # Generate unique ID for the new segment
        new_seg["id"] = str(uuid.uuid4()).upper()
        
        # source_timerange: Which part of the SOURCE VIDEO to use
        new_seg["source_timerange"] = {
            "start": sec_to_us(source_start_sec + seg_start),
            "duration": sec_to_us(seg_duration)
        }
        
        # target_timerange: Where to place it on the TIMELINE
        new_seg["target_timerange"] = {
            "start": timeline_cursor_us,
            "duration": sec_to_us(seg_duration)
        }
        
        new_segments.append(new_seg)
        timeline_cursor_us += sec_to_us(seg_duration)
    
    # Calculate total removed time
    original_duration_sec = source_duration_us / 1_000_000.0
    new_duration_sec = timeline_cursor_us / 1_000_000.0
    removed_sec = original_duration_sec - new_duration_sec
    
    print(f"   Original duration: {original_duration_sec:.2f}s")
    print(f"   New duration:      {new_duration_sec:.2f}s")
    print(f"   Removed silence:   {removed_sec:.2f}s ({removed_sec/original_duration_sec*100:.1f}%)")
    
    # 11. Replace the segments in the video track
    video_track["segments"] = new_segments
    
    # 12. Update project duration
    draft_data["duration"] = timeline_cursor_us
    
    # 13. Save via gateway (auto: force close CapCut → backup → write JSON)
    safe_save_draft(project_input, draft_data, step_name="01b")
    print(f"   ✅ CapCut JSON updated with {len(new_segments)} speech segments!")
    
    # Cleanup temp files
    if os.path.exists(temp_wav): os.remove(temp_wav)
    
    print(f"\n✅ Silence Cut Complete!")
    print(f"   CapCut project updated: {draft_path}")
    print(f"   💡 Next: Run 02-extract-audio.py to extract the final audio for transcription.")

if __name__ == "__main__":
    import os
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
    try:
        from registry import update_step
        from project_setup import handle_init_args
    except ImportError:
        pass
        
    project_name = handle_init_args(sys.argv)
        
    update_step(project_name, "01b", "wip")
    run_silence_cut(project_name)
    update_step(project_name, "01b", "done")
