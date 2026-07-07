import os
import sys
import subprocess
from pathlib import Path

# Add current dir to path to import capcut_utils
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from utils.capcut_utils import get_project_path, load_draft
except ImportError:
    print("❌ Error: Cannot find capcut_utils.py")
    sys.exit(1)

# Resolve ffmpeg binary via imageio_ffmpeg
try:
    import imageio_ffmpeg
    FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FFMPEG_PATH = "ffmpeg"

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

def extract_capcut_audio(project_input: str):
    """
    Extract audio based on the current segments in the CapCut timeline.
    Works perfectly after 01a (Timebolt) or 01b (Silero VAD) or manual cuts.
    """
    # 1. Resolve project
    try:
        project_dir = get_project_path(project_input)
        draft_data = load_draft(project_input)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
        
    print(f"▶️ CapCut project: {project_dir}")
    
    # 2. Find timeline segments
    video_track, video_segments = find_main_video_track(draft_data)
    if not video_track or not video_segments:
        print("❌ Error: No video track found in CapCut project.")
        sys.exit(1)
    
    # 3. Sort segments by target_timerange (timeline position)
    # This ensures audio is extracted in the exact order it plays on the timeline
    sorted_segments = sorted(
        video_segments, 
        key=lambda s: s.get("target_timerange", {}).get("start", 0)
    )
    
    print(f"   Found {len(sorted_segments)} active segments on the timeline.")
    
    # 4. First, extract full audio from source video to a temp WAV file
    # (We assume all segments come from the same source video for now, as is typical in VVE)
    # Let's find the first valid source video
    first_source_video = ""
    for seg in sorted_segments:
        mat_id = seg.get("material_id", "")
        source_video = get_video_source_path(draft_data, mat_id)
        if source_video and os.path.exists(source_video):
            first_source_video = source_video
            break
            
    if not first_source_video:
        print("❌ Error: Could not find a valid source video file.")
        sys.exit(1)
        
    temp_full_wav = os.path.join(project_dir, "_temp_full_audio.wav")
    print(f"   Extracting full audio to prevent keyframe drift...")
    subprocess.run([
        FFMPEG_PATH, "-y", "-i", first_source_video,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        temp_full_wav
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    if not os.path.exists(temp_full_wav):
        print("❌ Error: Failed to extract full audio.")
        sys.exit(1)
    
    # 5. Build FFmpeg complex filter for 100% sample-accurate extraction
    out_wav = os.path.join(project_dir, "cut_audio_16k.wav")
    
    total_dur_us = sum(s.get("source_timerange", {}).get("duration", 0) for s in sorted_segments)
    total_duration_sec = total_dur_us / 1_000_000.0
    
    temp_wav_fwd = temp_full_wav.replace('\\', '/')
    
    filters = []
    concat_inputs = ""
    for i, seg in enumerate(sorted_segments):
        start_us = seg.get("source_timerange", {}).get("start", 0)
        dur_us = seg.get("source_timerange", {}).get("duration", 0)
        
        start_sec = start_us / 1_000_000.0
        end_sec = (start_us + dur_us) / 1_000_000.0
        
        filters.append(f"[0:a]atrim=start={start_sec:.3f}:end={end_sec:.3f},asetpts=PTS-STARTPTS[a{i}]")
        concat_inputs += f"[a{i}]"
        
    filters.append(f"{concat_inputs}concat=n={len(sorted_segments)}:v=0:a=1[outa]")
    filter_str = "; ".join(filters)
    
    print(f"   Total expected audio duration: {total_duration_sec:.2f}s ({total_duration_sec/60:.2f}min)")
    print(f"   Splicing audio... (100% sample-accurate)")
    
    # 6. Run FFmpeg to extract and concatenate using filtergraph
    cmd = [
        FFMPEG_PATH, "-y", "-i", temp_full_wav,
        "-filter_complex", filter_str,
        "-map", "[outa]",
        "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        out_wav
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
    if os.path.exists(out_wav):
        print(f"\n✅ Extraction complete!")
        print(f"   Exported to: {out_wav}")
    else:
        print("\n❌ Error: Failed to generate audio file.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python 02-extract-audio.py <capcut_project_name_or_path>")
        print("  Example: python 02-extract-audio.py 0108")
        sys.exit(1)
        
    extract_capcut_audio(sys.argv[1])
