import os
import sys
import time
import torch

def run_whisperx():
    try:
        import imageio_ffmpeg
        import shutil
        import os
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        if not os.path.exists("ffmpeg.exe"):
            print(f"Copying ffmpeg from {ffmpeg_exe} to local directory...")
            shutil.copy(ffmpeg_exe, "ffmpeg.exe")
        # Also copy as ffprobe if needed (often same binary or packaged together, but we'll focus on ffmpeg)
    except ImportError:
        print("[!] imageio-ffmpeg is not installed. Will attempt to run without it, but may fail if ffmpeg is not in PATH.")

    try:
        import whisperx
    except ImportError:
        print("[!] whisperx is not installed. Please run: pip install whisperx")
        return

    # Configuration for GTX 1070 Ti (Pascal GPU)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    # Use int8 to save VRAM on GTX 1070 Ti
    compute_type = "int8" 
    batch_size = 4 # reduce to 4 to save memory during inference
    
    target_file = "27.ขวดน้ำตากแดด อันตราย(1).mp4"
    if len(sys.argv) > 1:
        target_file = sys.argv[1]
        
    model_size = "large-v3"
    
    print(f"=== WhisperX Word-Level Transcription POC ===")
    print(f"Target file: {target_file}")
    print(f"Device: {device}")
    
    try:
        print(f"\n[1/3] Loading WhisperX Model ('{model_size}')...")
        model = whisperx.load_model(model_size, device, compute_type=compute_type)
        
        print(f"\n[2/3] Transcribing Audio...")
        start_time = time.time()
        audio = whisperx.load_audio(target_file)
        result = model.transcribe(audio, batch_size=batch_size, language="th")
        print(f"[+] Initial transcription completed in {time.time() - start_time:.2f} seconds.")
        
        # Free up memory before alignment
        del model
        import gc; gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()
            
        print(f"\n[3/3] Loading Alignment Model for language: '{result['language']}'...")
        # Note: For Thai ('th'), WhisperX uses a multilingual phoneme model or fallback.
        align_model_name = "airesearch/wav2vec2-large-xlsr-53-th"
        print(f"Using custom Thai alignment model: {align_model_name}")
        model_a, metadata = whisperx.load_align_model(language_code="th", device=device, model_name=align_model_name)
        
        print(f"Aligning timestamps to extract Word-Level accuracy...")
        result = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)
        
        print("\n--- WhisperX Word-Level Results ---")
        with open("whisperx_result.txt", "w", encoding="utf-8") as f:
            for segment in result["segments"]:
                line = f"\n[{segment['start']:.2f}s -> {segment['end']:.2f}s]: {segment['text']}"
                print(line)
                f.write(line + "\n")
                
                # Check for word-level details
                if 'words' in segment:
                    for word in segment['words']:
                        # Some words might not get a timestamp if alignment fails for that specific phoneme
                        if 'start' in word and 'end' in word:
                            w_line = f"   - [{word['start']:.2f}s -> {word['end']:.2f}s]: {word['word']}"
                            print(w_line)
                            f.write(w_line + "\n")
                        else:
                            w_line = f"   - [??.??s -> ??.??s]: {word.get('word', '')}"
                            print(w_line)
                            f.write(w_line + "\n")
                            
        print("\n[+] WhisperX process finished successfully. Results saved to whisperx_result.txt")

    except Exception as e:
        print(f"\n[-] WhisperX encountered an error: {e}")

if __name__ == "__main__":
    run_whisperx()
