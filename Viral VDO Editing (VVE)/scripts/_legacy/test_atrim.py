import subprocess
import json
import os
import sys
try:
    import imageio_ffmpeg
    FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FFMPEG_PATH = "ffmpeg"

def run():
    path_01b = 'C:/Users/Admin/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/Test Auto/.snapshots/step_01b.json'
    with open(path_01b, 'r', encoding='utf-8') as f:
        draft = json.load(f)
        
    track = None
    for t in draft.get('tracks', []):
        if t.get('type') == 'video' and t.get('segments'):
            track = t
            break
            
    segments = sorted(track['segments'], key=lambda s: s.get("target_timerange", {}).get("start", 0))
    
    first_source_video = ""
    for v in draft.get("materials", {}).get("videos", []):
        if v.get("id") == segments[0].get("material_id", ""):
            first_source_video = v.get("path", "")
            break
            
    project_dir = 'C:/Users/Admin/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/Test Auto'
    temp_wav = os.path.join(project_dir, "_temp_full_audio.wav").replace("\\", "/")
    out_wav = os.path.join(project_dir, "cut_audio_16k_perfect.wav").replace("\\", "/")
    
    filters = []
    concat_inputs = ""
    
    total_dur = 0
    for i, seg in enumerate(segments):
        start_us = seg.get("source_timerange", {}).get("start", 0)
        dur_us = seg.get("source_timerange", {}).get("duration", 0)
        
        start_sec = start_us / 1_000_000.0
        end_sec = (start_us + dur_us) / 1_000_000.0
        
        filters.append(f"[0:a]atrim=start={start_sec:.3f}:end={end_sec:.3f},asetpts=PTS-STARTPTS[a{i}]")
        concat_inputs += f"[a{i}]"
        
        total_dur += dur_us
        
    filters.append(f"{concat_inputs}concat=n={len(segments)}:v=0:a=1[outa]")
    filter_str = "; ".join(filters)
    
    print(f"Total expected: {total_dur/1000000.0}s")
    
    cmd = [
        FFMPEG_PATH, "-y", "-i", temp_wav,
        "-filter_complex", filter_str,
        "-map", "[outa]",
        "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        out_wav
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # Check length
    import wave
    with wave.open(out_wav, 'rb') as w:
        frames = w.getnframes()
        rate = w.getframerate()
        print(f"Generated length: {frames/float(rate)}s")
run()
