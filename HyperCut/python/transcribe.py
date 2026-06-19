import os
import sys
import time
import json
import torch
from faster_whisper import WhisperModel

def emit_progress(step, status, progress=None):
    """ส่ง Progress ออกมาเป็น JSON เพื่อให้ Electron จับไปแสดงผล"""
    msg = {"type": "progress", "step": step, "status": status}
    if progress is not None:
        msg["progress"] = progress
    print(json.dumps(msg), flush=True)

def emit_result(data):
    """ส่งผลลัพธ์กลับไปยัง Electron"""
    print(json.dumps({"type": "result", "data": data}), flush=True)

def emit_error(message):
    """ส่งข้อผิดพลาดกลับไปยัง Electron"""
    print(json.dumps({"type": "error", "message": message}), flush=True)
    sys.exit(1)

def group_whisper_chars(whisper_chars):
    from pythainlp.tokenize import word_tokenize
    # Strip leading/trailing whitespace from each whisper word first
    # (Faster-Whisper often returns words with leading space e.g. ' น้ำ')
    cleaned_chars = []
    for wc in whisper_chars:
        stripped = wc.word.strip()
        if stripped:  # skip pure-whitespace tokens
            # Create a simple namespace to hold the cleaned word + original timing
            class W:
                pass
            w = W()
            w.word = stripped
            w.start = wc.start
            w.end = wc.end
            cleaned_chars.append(w)

    full_text = "".join([w.word for w in cleaned_chars])
    tokens = word_tokenize(full_text, engine="newmm", keep_whitespace=False)
    
    char_time_map = []
    for wc in cleaned_chars:
        word_text = wc.word
        duration = wc.end - wc.start
        char_duration = duration / len(word_text) if len(word_text) > 0 else 0
        for i, char in enumerate(word_text):
            char_time_map.append({
                "char": char,
                "start": wc.start + (i * char_duration),
                "end": wc.start + ((i + 1) * char_duration)
            })
            
    grouped = []
    map_idx = 0
    for token in tokens:
        token_clean = token.strip()
        if not token_clean:  # skip empty/whitespace tokens
            map_idx += len(token)
            continue
        if map_idx >= len(char_time_map):
            break
        token_start = char_time_map[map_idx]["start"]
        map_idx += len(token_clean)
        token_end = char_time_map[map_idx - 1]["end"] if map_idx - 1 < len(char_time_map) else char_time_map[-1]["end"]
        grouped.append({"word": token_clean, "start": token_start, "end": token_end})
    return grouped

def main():
    if len(sys.argv) < 2:
        emit_error("No input file provided.")
        
    target_file = sys.argv[1]
    if not os.path.exists(target_file):
        emit_error(f"File not found: {target_file}")

    emit_progress("init", "Initializing AI Models...", 10)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "int8_float32" if device == "cuda" else "int8"
    model_size = "large-v3"
    
    try:
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
    except Exception as e:
        emit_error(f"Failed to load model: {str(e)}")

    emit_progress("transcribe", "Listening and Transcribing...", 30)
    try:
        segments, info = model.transcribe(target_file, beam_size=5, language="th", word_timestamps=True)
        
        all_grouped_words = []
        raw_segments = []
        
        # We don't know the exact total length upfront easily without traversing the generator, 
        # but we can fake progress or use the file duration if we had it.
        # For simplicity, we just parse segments.
        for segment in segments:
            # Emit mini-progress
            emit_progress("transcribe", f"Transcribed up to {segment.end:.2f}s...")
            raw_segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
            if segment.words:
                grouped_words = group_whisper_chars(segment.words)
                all_grouped_words.extend(grouped_words)

        emit_progress("subtitle", "Generating Subtitles (SRT)...", 80)
        
        # Subtitle Generator
        base_dir = os.path.dirname(os.path.abspath(__file__))
        sys.path.append(base_dir) # Make sure we can import subtitle_generator
        try:
            import subtitle_generator
            out_dir = os.path.dirname(os.path.abspath(target_file))
            file_name = os.path.splitext(os.path.basename(target_file))[0]
            
            # Export to the same folder as the video
            subtitle_generator.generate_srt(all_grouped_words, os.path.join(out_dir, f"{file_name}_hormozi.srt"), preset="hormozi")
            subtitle_generator.generate_srt(all_grouped_words, os.path.join(out_dir, f"{file_name}_flow.srt"), preset="flow")
            subtitle_generator.generate_srt(all_grouped_words, os.path.join(out_dir, f"{file_name}_classic.srt"), preset="classic")
        except Exception as e:
            emit_error(f"Failed to generate SRT: {str(e)}")

        emit_progress("done", "Processing Complete!", 100)
        
        # Send final JSON back
        emit_result({
            "language": info.language,
            "segments": raw_segments,
            "words": all_grouped_words
        })
        
        # Prevent PyTorch/CUDA teardown crash on Windows (STATUS_STACK_BUFFER_OVERRUN)
        os._exit(0)
        
    except Exception as e:
        emit_error(f"Transcription failed: {str(e)}")

if __name__ == "__main__":
    main()
