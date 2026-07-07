import json
import sys
from pathlib import Path

# Fix Windows console encoding for emojis
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def format_time(seconds: float) -> str:
    """Format seconds into SRT timestamp (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    msecs = int(round((seconds - int(seconds)) * 1000))
    # Handle rounding edge cases where msecs becomes 1000
    if msecs >= 1000:
        msecs = 0
        secs += 1
        if secs >= 60:
            secs = 0
            minutes += 1
            if minutes >= 60:
                minutes = 0
                hours += 1
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{msecs:03d}"

def json_to_srt(grouped_json_path: str, output_srt_path: str):
    data = json.loads(Path(grouped_json_path).read_text(encoding="utf-8"))
    groups = data.get("groups", [])
    
    if not groups:
        print("No subtitle groups found.")
        return

    with open(output_srt_path, "w", encoding="utf-8") as f:
        for i, group in enumerate(groups, start=1):
            start_str = format_time(group["start"])
            end_str = format_time(group["end"])
            text = group["text"]
            
            f.write(f"{i}\n")
            f.write(f"{start_str} --> {end_str}\n")
            f.write(f"{text}\n\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python 06-generate-srt.py <job_dir>")
        sys.exit(1)
        
    input_arg = sys.argv[1]
    
    # Resolve job_dir properly using capcut_utils
    import os
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    try:
        from utils.capcut_utils import get_project_path
        job_dir = Path(get_project_path(input_arg))
    except Exception as e:
        print(f"❌ Error resolving project path: {e}")
        job_dir = Path(input_arg)
    
    json_files = list(job_dir.glob("*.grouped.json"))
    if not json_files:
        print(f"❌ Error: No .grouped.json found in {job_dir}")
        sys.exit(1)
        
    json_path = str(json_files[0])
    
    out_path = str(Path(json_path).with_suffix(""))
    if out_path.endswith(".grouped"):
        out_path = out_path[:-8]
    out_path += ".srt"
    
    # Also save a copy to intermediates
    inter_path = job_dir / "intermediates"
    inter_path.mkdir(exist_ok=True)
    inter_srt_path = inter_path / "subtitles.srt"
    
    json_to_srt(json_path, out_path)
    json_to_srt(json_path, str(inter_srt_path))
    
    # Auto-copy SRT to the source video folder (same name as video)
    video_files = list(job_dir.glob("*.mp4"))
    if video_files:
        video_path = video_files[0]
        source_srt_path = video_path.with_suffix(".srt")
        import shutil
        shutil.copy2(out_path, source_srt_path)
        print(f"Success! SRT saved to {out_path}, {inter_srt_path}, and beside source video {source_srt_path}")
    else:
        print(f"Success! SRT saved to {out_path} and {inter_srt_path}")
