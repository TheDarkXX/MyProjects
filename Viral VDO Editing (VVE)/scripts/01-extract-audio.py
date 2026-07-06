import os
import sys
import json
from pathlib import Path
from moviepy import AudioFileClip, concatenate_audioclips

def extract_cut_audio(video_path, timebolt_json_path, output_wav):
    print(f"Loading raw audio from {video_path}...")
    audio = AudioFileClip(video_path)
    
    print(f"Parsing Timebolt cuts from {timebolt_json_path}...")
    with open(timebolt_json_path, 'r', encoding='utf-8') as f:
        tb_data = json.load(f)
        
    clips_to_keep = []
    kept_duration = 0.0
    
    for seg in tb_data:
        if seg.get('operation') == 'keep':
            start = seg['start']
            end = seg['start'] + seg['duration']
            
            if start >= audio.duration:
                continue
            if end > audio.duration:
                end = audio.duration
                
            subclip = audio.subclipped(start, end)
            clips_to_keep.append(subclip)
            kept_duration += (end - start)
            
    print(f"Found {len(clips_to_keep)} 'keep' segments. Total cut duration: {kept_duration/60:.2f} mins")
    
    print(f"Concatenating and exporting to 16kHz WAV: {output_wav}... (This might take 1-2 minutes)")
    final_audio = concatenate_audioclips(clips_to_keep)
    final_audio.write_audiofile(output_wav, fps=16000, nbytes=2, codec='pcm_s16le')
    
    # Cleanup
    for c in clips_to_keep:
        c.close()
    audio.close()
    print("✅ Extraction complete!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python 01-extract-audio.py <job_dir>")
        sys.exit(1)
        
    job_dir = Path(sys.argv[1])
    
    # Auto-discover video and timebolt json
    video_files = list(job_dir.glob("*.mp4"))
    json_files = list(job_dir.glob("*.json"))
    
    if not video_files:
        print(f"❌ Error: No .mp4 file found in {job_dir}")
        sys.exit(1)
        
    # Exclude pipeline-generated jsons
    tb_files = [f for f in json_files if not f.name.endswith(".transcript.json") and not f.name.endswith(".grouped.json") and not f.name.startswith("scene_table") and not f.name.startswith("timeline_commands") and not f.name.startswith("checkpoint")]
    
    if not tb_files:
        print(f"❌ Error: No Timebolt .json file found in {job_dir}")
        sys.exit(1)
        
    video_path = str(video_files[0])
    tb_json = str(tb_files[0])
    out_wav = str(Path(video_path).with_suffix("")) + ".cut_audio_16k.wav"
    
    extract_cut_audio(video_path, tb_json, out_wav)
