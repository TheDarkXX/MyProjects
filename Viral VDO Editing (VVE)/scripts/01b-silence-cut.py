import os
import sys
import json
import subprocess
from pathlib import Path
from moviepy import AudioFileClip

# Add current dir to path to import config_loader
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from config_loader import load_channel_config, get_audio
except ImportError:
    def load_channel_config(): return {}
    def get_audio(c, s, k, d): return d

def run_silence_cut(job_dir: str):
    job_path = Path(job_dir)
    # Get original MP4s that are not _ALTERED
    video_files = [f for f in job_path.glob("*.mp4") if not f.name.endswith("_ALTERED.mp4")]
    
    if not video_files:
        print(f"❌ Error: No original .mp4 file found in {job_dir}")
        sys.exit(1)
        
    target_file = str(video_files[0])
    
    config = load_channel_config()
    margin = get_audio(config, "silence", "margin", "0.2s,0.4s")
    
    print(f"▶️ Starting Silence Removal on {target_file} with margin {margin}...")
    
    command = [
        sys.executable, "-m", "auto_editor",
        target_file,
        "--margin", margin,
        "--no-open"
    ]
    
    try:
        process = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8'
        )
        
        if process.returncode != 0:
            print(f"❌ Auto-editor failed with code {process.returncode}")
            print(process.stdout)
            sys.exit(1)
            
        base, ext = os.path.splitext(target_file)
        altered_file = f"{base}_ALTERED{ext}"
        
        if not os.path.exists(altered_file):
            print("❌ Error: Altered video file not found.")
            sys.exit(1)
            
        print("✅ Silence removal complete! Video saved to:", altered_file)
        
        # Extract audio for the rest of the pipeline
        out_wav = f"{base}.cut_audio_16k.wav"
        print(f"Extracting 16kHz audio to {out_wav}...")
        
        audio = AudioFileClip(altered_file)
        audio.write_audiofile(out_wav, fps=16000, nbytes=2, codec='pcm_s16le')
        audio.close()
        
        print("✅ Extraction complete!")
        
    except Exception as e:
        print(f"❌ Failed to run auto-editor: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python 01b-silence-cut.py <job_dir>")
        sys.exit(1)
        
    run_silence_cut(sys.argv[1])
