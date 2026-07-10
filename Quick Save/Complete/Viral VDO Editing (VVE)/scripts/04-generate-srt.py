import json
import sys
from pathlib import Path

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
        print("Usage: python generate_srt.py <grouped_json_file>")
        sys.exit(1)
        
    json_path = sys.argv[1]
    
    if len(sys.argv) > 2:
        out_path = sys.argv[2]
    else:
        # Default to replacing .grouped.json with .srt
        out_path = str(Path(json_path).with_suffix(""))
        if out_path.endswith(".grouped"):
            out_path = out_path[:-8]
        out_path += ".srt"
        
    json_to_srt(json_path, out_path)
    print(f"Success! SRT saved to {out_path}")
