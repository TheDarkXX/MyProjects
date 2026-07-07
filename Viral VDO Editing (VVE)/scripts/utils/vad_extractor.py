import os
import json
import argparse
import warnings
import torch
import torchaudio

# Suppress PyTorch warnings
warnings.filterwarnings("ignore")

import tempfile
import soundfile as sf
from moviepy import VideoFileClip

def load_audio(file_path: str, target_sr: int = 16000):
    """Extract audio from video using moviepy and load with soundfile."""
    temp_wav = tempfile.mktemp(suffix=".wav")
    try:
        clip = VideoFileClip(file_path)
        clip.audio.write_audiofile(temp_wav, fps=target_sr, nbytes=2, codec='pcm_s16le')
        
        # Read with soundfile to avoid torchaudio backend errors on Windows
        data, sr = sf.read(temp_wav, dtype='float32')
        wav = torch.from_numpy(data)
        
        # Silero VAD requires mono audio
        if wav.ndim > 1:
            wav = torch.mean(wav, dim=1)
        return wav
    finally:
        if 'clip' in locals():
            clip.close()
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except:
                pass

def detect_speech(audio_path: str):
    """Detect speech segments using Silero VAD and apply auto-trim."""
    # Load model from torch hub
    model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                  model='silero_vad',
                                  force_reload=False,
                                  onnx=False)
    
    (get_speech_timestamps,
     save_audio,
     read_audio,
     VADIterator,
     collect_chunks) = utils

    SAMPLING_RATE = 16000
    wav = load_audio(audio_path, target_sr=SAMPLING_RATE)
    
    speech_timestamps = get_speech_timestamps(wav, model, sampling_rate=SAMPLING_RATE)
    
    padding_s = 0.1  # 100ms padding
    
    segments = []
    for ts in speech_timestamps:
        start_s = max(0.0, (ts['start'] / SAMPLING_RATE) - padding_s)
        end_s = (ts['end'] / SAMPLING_RATE) + padding_s
        segments.append({
            "start": round(start_s, 3),
            "end": round(end_s, 3),
            "duration": round(end_s - start_s, 3)
        })
        
    trim_start = 0.0
    trim_end = 0.0
    
    if segments:
        trim_start = segments[0]['start']
        trim_end = segments[-1]['end']
        
    result = {
        "audio_path": audio_path,
        "trim_start": trim_start,
        "trim_end": trim_end,
        "total_speech_segments": len(segments),
        "segments": segments
    }
    
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract speech timestamps using Silero VAD.")
    parser.add_argument("audio_path", type=str, help="Path to the audio or video file")
    parser.add_argument("--out", type=str, default="vad_result.json", help="Output JSON path")
    args = parser.parse_args()
    
    if not os.path.exists(args.audio_path):
        print(json.dumps({"error": f"File not found: {args.audio_path}"}))
        exit(1)
        
    try:
        data = detect_speech(args.audio_path)
        with open(args.out, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(json.dumps({"status": "success", "output": args.out, "trim_start": data['trim_start'], "trim_end": data['trim_end']}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        exit(1)
