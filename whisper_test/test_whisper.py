import os
import sys
import time
import torch
from faster_whisper import WhisperModel

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

    if len(sys.argv) > 1:
        target_file = sys.argv[1]
    else:
        # Find audio/video file in the same directory
        supported_extensions = ('.mp3', '.wav', '.m4a', '.mp4', '.mkv', '.mov')
        files = [f for f in os.listdir('.') if f.lower().endswith(supported_extensions)]
        
        if not files:
            print("\n[!] Please place a short video/audio file (e.g. test.mp4 or test.mp3) in this folder and run the script again.")
            return
        target_file = files[0]

    print(f"\n[+] Found video/audio file: {target_file}")
    
    # Support custom model size as the second argument
    model_size = "large-v3"
    if len(sys.argv) > 2:
        model_size = sys.argv[2]

    print(f"\nLoading Whisper Model: '{model_size}'...")
    if model_size == "large-v3":
        print("Note: On the first run, this will download ~3GB model. Please wait...")
    
    start_time = time.time()
    model = None
    
    # Try GPU compute types in order of efficiency
    compute_types = ["int8_float16", "int8_float32", "int8", "float32"]
    for comp_type in compute_types:
        try:
            print(f"Attempting to load model on GPU (CUDA) with compute type: '{comp_type}'...")
            model = WhisperModel(model_size, device="cuda", compute_type=comp_type)
            print(f"[+] Model loaded on GPU successfully with {comp_type}!")
            break
        except Exception as e:
            print(f"[-] GPU load with {comp_type} failed: {e}")
            
    if model is None:
        print("\n[-] All GPU load attempts failed. Falling back to CPU...")
        try:
            model = WhisperModel(model_size, device="cpu", compute_type="int8")
            print("[+] Model loaded on CPU successfully!")
        except Exception as cpu_e:
            print(f"[-] CPU load failed: {cpu_e}")
            return

    load_time = time.time() - start_time
    print(f"Model initialization time: {load_time:.2f} seconds.")

def group_whisper_chars(whisper_chars):
    from pythainlp.tokenize import word_tokenize
    
    # 1. Reconstruct the exact string sequence from Whisper
    full_text = "".join([w.word for w in whisper_chars])
    
    # 2. Tokenize using PyThaiNLP
    tokens = word_tokenize(full_text, engine="newmm", keep_whitespace=True)
    
    # 3. Create a flat character-to-time map
    char_time_map = []
    for wc in whisper_chars:
        word_text = wc.word
        duration = wc.end - wc.start
        char_duration = duration / len(word_text) if len(word_text) > 0 else 0
        
        for i, char in enumerate(word_text):
            char_time_map.append({
                "char": char,
                "start": wc.start + (i * char_duration),
                "end": wc.start + ((i + 1) * char_duration)
            })
            
    # 4. Map tokens back to timestamps
    grouped = []
    map_idx = 0
    for token in tokens:
        if not token.strip(): # Skip pure whitespaces for subtitle output
            map_idx += len(token)
            continue
            
        if map_idx >= len(char_time_map):
            break
            
        token_start = char_time_map[map_idx]["start"]
        map_idx += len(token)
        token_end = char_time_map[map_idx - 1]["end"] if map_idx - 1 < len(char_time_map) else char_time_map[-1]["end"]
        
        grouped.append({
            "word": token.strip(),
            "start": token_start,
            "end": token_end
        })
        
    return grouped

def run_transcription():
    target_file = "27.ขวดน้ำตากแดด อันตราย(1).mp4"
    if not os.path.exists(target_file):
        print(f"[-] Target file '{target_file}' not found.")
        return

    print("=== Whisper Thai Transcription with Word Grouper ===")
    print(f"Target file: {target_file}")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")
    
    model_size = "large-v3"
    # Pascal GPU (GTX 1070 Ti) does not support float16 well, use int8_float32
    compute_type = "int8_float32" if device == "cuda" else "int8"
    
    try:
        start_time = time.time()
        print(f"[1/2] Loading Faster-Whisper Model ('{model_size}')...")
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print(f"Model initialization time: {time.time() - start_time:.2f} seconds.")
    except Exception as e:
        print(f"Failed to load model: {e}")
        return

    print("\n[2/2] Starting Transcription...")
    transcribe_start = time.time()
    try:
        segments, info = model.transcribe(target_file, beam_size=5, language="th", word_timestamps=True)
        print(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
        
        print("\n--- Transcription Results (Word-Level Grouped) ---")
        all_grouped_words = []
        
        with open("whisper_grouper_result.txt", "w", encoding="utf-8") as f:
            for segment in segments:
                line = f"\n[{segment.start:.2f}s -> {segment.end:.2f}s]: {segment.text}"
                print(line)
                f.write(line + "\n")
                
                if segment.words:
                    # Apply PyThaiNLP grouper
                    grouped_words = group_whisper_chars(segment.words)
                    all_grouped_words.extend(grouped_words) # Accumulate for SRT
                    
                    for gw in grouped_words:
                        w_line = f"  - [{gw['start']:.2f}s -> {gw['end']:.2f}s]: {gw['word']}"
                        print(w_line)
                        f.write(w_line + "\n")
                        
        # ----------------------------------------------------
        # Generate SRT Files using Subtitle Generator
        # ----------------------------------------------------
        try:
            import subtitle_generator
            print("\n=== Generating Subtitle Files (.srt) ===")
            subtitle_generator.generate_srt(all_grouped_words, "hypercut_preset_hormozi.srt", preset="hormozi")
            subtitle_generator.generate_srt(all_grouped_words, "hypercut_preset_flow.srt", preset="flow")
            subtitle_generator.generate_srt(all_grouped_words, "hypercut_preset_classic.srt", preset="classic")
        except Exception as srt_err:
            print(f"[-] Failed to generate SRT: {srt_err}")
            
        transcribe_time = time.time() - transcribe_start
        print(f"\n[+] Transcription & Subtitle generation completed in {transcribe_time:.2f} seconds.")
    except Exception as e:
        print(f"[-] Transcription failed: {e}")

if __name__ == "__main__":
    check_cuda()
    run_transcription()
