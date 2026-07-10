import tempfile
import soundfile as sf
import numpy as np
from moviepy import VideoFileClip
import whisper
import os
import json
import argparse
import warnings
warnings.filterwarnings("ignore")

def load_audio_np(file_path: str, target_sr: int = 16000):
    """Extract audio from video using moviepy and load with soundfile as numpy array."""
    temp_wav = tempfile.mktemp(suffix=".wav")
    try:
        clip = VideoFileClip(file_path)
        clip.audio.write_audiofile(temp_wav, fps=target_sr, nbytes=2, codec='pcm_s16le')
        
        data, sr = sf.read(temp_wav, dtype='float32')
        if data.ndim > 1:
            data = np.mean(data, axis=1) # Convert to mono
        return data
    finally:
        if 'clip' in locals():
            clip.close()
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except:
                pass

def transcribe_audio(audio_path: str, model_size: str = "base"):
    """Transcribe audio using Whisper with word-level timestamps."""
    print(f"Loading Whisper model '{model_size}'...")
    model = whisper.load_model(model_size)
    
    print(f"Extracting audio from {audio_path}...")
    audio_np = load_audio_np(audio_path)
    
    print(f"Transcribing {audio_path}...")
    # Transcribe with word-level timestamps
    result = model.transcribe(audio_np, word_timestamps=True, language="th")
    
    # Process output
    segments = []
    all_words = []
    
    for seg in result.get('segments', []):
        segment_data = {
            "id": seg['id'],
            "start": round(seg['start'], 3),
            "end": round(seg['end'], 3),
            "text": seg['text'].strip()
        }
        segments.append(segment_data)
        
        for w in seg.get('words', []):
            all_words.append({
                "start": round(w['start'], 3),
                "end": round(w['end'], 3),
                "word": w['word'].strip()
            })
            
    return {
        "audio_path": audio_path,
        "language": result.get("language"),
        "text": result.get("text").strip(),
        "segments": segments,
        "words": all_words
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcribe audio using Whisper.")
    parser.add_argument("audio_path", type=str, help="Path to the audio or video file")
    parser.add_argument("--out", type=str, default="transcript_result.json", help="Output JSON path")
    parser.add_argument("--model", type=str, default="base", help="Whisper model size (tiny, base, small, medium, large)")
    args = parser.parse_args()
    
    if not os.path.exists(args.audio_path):
        print(json.dumps({"error": f"File not found: {args.audio_path}"}))
        exit(1)
        
    try:
        data = transcribe_audio(args.audio_path, args.model)
        with open(args.out, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(json.dumps({"status": "success", "output": args.out, "segments": len(data['segments']), "words": len(data['words'])}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        exit(1)
