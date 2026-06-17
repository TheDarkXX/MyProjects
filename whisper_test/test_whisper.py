import os
import sys
import time

def check_cuda():
    print("=== System check ===")
    print(f"Python Version: {sys.version}")
    try:
        import torch
        cuda_available = torch.cuda.is_available()
        print(f"PyTorch CUDA Available: {cuda_available}")
        if cuda_available:
            print(f"GPU Device Name: {torch.cuda.get_device_name(0)}")
    except ImportError:
        print("PyTorch is not installed yet in this environment.")

def run_transcription():
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("\n[!] faster-whisper is not installed. Please run: pip install faster-whisper")
        return

    # Find audio/video file in the same directory
    supported_extensions = ('.mp3', '.wav', '.m4a', '.mp4', '.mkv', '.mov')
    files = [f for f in os.listdir('.') if f.lower().endswith(supported_extensions)]
    
    if not files:
        print("\n[!] Please place a short video/audio file (e.g. test.mp4 or test.mp3) in this folder and run the script again.")
        return

    target_file = files[0]
    print(f"\n[+] Found video/audio file: {target_file}")
    
    # We will use OpenAI's largest, most accurate model: 'large-v3'
    model_size = "large-v3"
    print(f"Loading Whisper Model: '{model_size}' (Most accurate)...")
    print("Note: On the first run, this will download ~3GB model. Please wait...")
    
    start_time = time.time()
    try:
        # We use 'int8_float16' to fit the model comfortably in 6GB VRAM on GTX 1060
        model = WhisperModel(model_size, device="cuda", compute_type="int8_float16")
        print("[+] Model loaded on GPU (CUDA) successfully!")
    except Exception as e:
        print(f"\n[-] GPU/CUDA load failed: {e}")
        print("Falling back to CPU (This will be much slower)...")
        try:
            model = WhisperModel(model_size, device="cpu", compute_type="int8")
            print("[+] Model loaded on CPU successfully!")
        except Exception as cpu_e:
            print(f"[-] CPU load failed: {cpu_e}")
            return

    load_time = time.time() - start_time
    print(f"Model initialization time: {load_time:.2f} seconds.")

    print("\n=== Starting Transcription ===")
    transcribe_start = time.time()
    try:
        segments, info = model.transcribe(target_file, beam_size=5, language="th")
        print(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
        
        print("\n--- Transcription Results ---")
        for segment in segments:
            print(f"[{segment.start:.2f}s -> {segment.end:.2f}s]: {segment.text}")
            
        transcribe_time = time.time() - transcribe_start
        print(f"\n[+] Transcription completed in {transcribe_time:.2f} seconds.")
    except Exception as e:
        print(f"[-] Transcription failed: {e}")

if __name__ == "__main__":
    check_cuda()
    run_transcription()
