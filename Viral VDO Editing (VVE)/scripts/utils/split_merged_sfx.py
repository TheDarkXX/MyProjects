import os
import subprocess
import json
import numpy as np
from pydub import AudioSegment
from pydub.silence import split_on_silence

# Paths
INPUT_MP3 = r"V:\DoctorBank Family\DoctorBank Brand\Sound Effect\sfx rr.MP3"
TEMP_WAV = r"C:\My Claw\MyProjects\Viral VDO Editing (VVE)\scratch\temp_sfx_rr.wav"
OUTPUT_DIR = r"V:\DoctorBank Family\DoctorBank Brand\Sound Effect"

# The 12 names in order matching the timeline image
TARGET_NAMES = [
    "sfx_camera_shutter_1.wav",
    "sfx_camera_shutter_2.wav",
    "sfx_camera_flash.wav",
    "sfx_paper_slide.wav",
    "sfx_paper_turn.wav",
    "sfx_keyboard_typing_1.wav",
    "sfx_keyboard_typing_slow.wav",
    "sfx_keyboard_pc.wav",
    "sfx_click.wav",
    "sfx_enter.wav",
    "sfx_computer_click.wav",
    "sfx_mouse_click.wav"
]

def find_ffmpeg():
    base_path = r"C:\Users\Admin\AppData\Local\CapCut\Apps"
    if not os.path.exists(base_path):
        raise FileNotFoundError("CapCut Apps directory not found.")
    
    app_dirs = sorted(os.listdir(base_path))
    for app in reversed(app_dirs):
        ffmpeg_path = os.path.join(base_path, app, "ffmpeg.exe")
        if os.path.exists(ffmpeg_path):
            return ffmpeg_path
    raise FileNotFoundError("ffmpeg.exe not found in CapCut Apps.")

def split_audio():
    ffmpeg = find_ffmpeg()
    print(f"Using ffmpeg: {ffmpeg}")
    
    # 1. Convert MP3 to WAV using CapCut's ffmpeg to bypass ffprobe dependency in pydub
    print("Converting MP3 to WAV...")
    os.makedirs(os.path.dirname(TEMP_WAV), exist_ok=True)
    cmd = [ffmpeg, "-y", "-i", INPUT_MP3, "-acodec", "pcm_s16le", "-ar", "44100", TEMP_WAV]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    print("Conversion done.")
    
    # 2. Load WAV with pydub (WAV doesn't require ffprobe)
    print("Loading WAV into PyDub...")
    sound = AudioSegment.from_wav(TEMP_WAV)
    print(f"Sound duration: {len(sound)} ms")
    
    # 3. Split on silence
    # We need a large min_silence_len (e.g. 1000ms) because keyboard typing sound consists of
    # fast clicks separated by short silences. We only want to split on the gaps between the 12 main effects.
    print("Splitting audio based on silence...")
    
    target_count = 12
    best_chunks = []
    best_len = 1000
    best_thresh = -35
    
    # Grid search for parameters that yield exactly 12 chunks
    found_exact = False
    for silence_len in [2500, 2000, 1500, 1200, 1000, 800, 600]:
        if found_exact:
            break
        for thresh in range(-30, -50, -2):
            chunks = split_on_silence(
                sound,
                min_silence_len=silence_len,
                silence_thresh=thresh,
                keep_silence=200 # keep 200ms padding
            )
            print(f"  Attempt: min_silence={silence_len}ms, thresh={thresh}dBFS -> found {len(chunks)} chunks")
            if len(chunks) == target_count:
                best_chunks = chunks
                best_len = silence_len
                best_thresh = thresh
                found_exact = True
                print(f"Success: Found exactly {target_count} chunks (len={silence_len}ms, thresh={thresh}dBFS)!")
                break
            
            # Save closest match
            if not best_chunks or abs(len(chunks) - target_count) < abs(len(best_chunks) - target_count):
                best_chunks = chunks
                best_len = silence_len
                best_thresh = thresh

    if len(best_chunks) != target_count:
        print(f"[WARN] Could not find exactly {target_count} segments. Found {len(best_chunks)} segments.")
        print(f"Using closest match (min_silence={best_len}ms, thresh={best_thresh}dBFS).")
    
    # 4. Export and normalize chunks
    print("Exporting split files...")
    for i, chunk in enumerate(best_chunks):
        # Peak normalization for each chunk to -2 dBFS (80% peak amplitude)
        normalized_chunk = chunk.normalize(headroom=2.0)
        
        # Determine output filename
        if i < len(TARGET_NAMES):
            out_name = TARGET_NAMES[i]
        else:
            out_name = f"sfx_extra_{i+1}.wav"
            
        out_path = os.path.join(OUTPUT_DIR, out_name)
        normalized_chunk.export(out_path, format="wav")
        print(f"  [OK] Exported {out_name} (Duration: {len(normalized_chunk)} ms)")
        
    # Clean up
    if os.path.exists(TEMP_WAV):
        os.remove(TEMP_WAV)
        
    print("\n[OK] Audio splitting and normalization complete!")

if __name__ == "__main__":
    split_audio()
