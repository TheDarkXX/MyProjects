from moviepy.editor import AudioFileClip, concatenate_audioclips
import json
import os
import sys

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
                
            subclip = audio.subclip(start, end)
            clips_to_keep.append(subclip)
            kept_duration += (end - start)
            
    print(f"Found {len(clips_to_keep)} 'keep' segments. Total cut duration: {kept_duration/60:.2f} mins")
    
    print(f"Concatenating and exporting to 16kHz WAV: {output_wav}...")
    final_audio = concatenate_audioclips(clips_to_keep)
    final_audio.write_audiofile(output_wav, fps=16000, nbytes=2, codec='pcm_s16le')
    
    # Cleanup
    for c in clips_to_keep:
        c.close()
    audio.close()
    print("✅ Extraction complete!")

if __name__ == '__main__':
    video = r"V:\DoctorBank Family\DR.POW\93.7 สุดยอดอาหารบำรุงไต\video_20250929_145057.mp4"
    tb_json = r"V:\DoctorBank Family\DR.POW\93.7 สุดยอดอาหารบำรุงไต\video_20250929_145057.mp4.json"
    out_wav = r"V:\DoctorBank Family\DR.POW\93.7 สุดยอดอาหารบำรุงไต\audio_cut_16k.wav"
    extract_cut_audio(video, tb_json, out_wav)
