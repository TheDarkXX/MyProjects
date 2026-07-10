import sys
import re
from pathlib import Path

def print_srt_text(srt_path):
    if not srt_path.exists():
        print(f"Error: {srt_path} not found.")
        return

    text_content = []
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Split into subtitle blocks
    blocks = content.strip().split("\n\n")
    for block in blocks:
        lines = block.split("\n")
        if len(lines) >= 3:
            # line 0: index, line 1: timestamp, line 2+: text
            text = " ".join(lines[2:])
            text_content.append(text)
            
    final_text = " ".join(text_content)
    
    print("\n" + "="*60)
    print("✅ FINAL SRT VERIFICATION (from generated subtitles)")
    print("="*60 + "\n")
    print(final_text)
    print("\n" + "="*60)
    print(f"Total subtitle blocks: {len(blocks)}")
    print(f"Total characters: {len(final_text)}")
    print("="*60 + "\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/debug/verify_srt.py <job_dir>")
        sys.exit(1)
        
    from utils.capcut_utils import get_project_path
    project_dir = get_project_path(sys.argv[1])
    
    srt_file = Path(project_dir) / "intermediates" / "subtitles.srt"
    if not srt_file.exists():
        srt_file = Path(project_dir) / "transcript.srt"
        
    print_srt_text(srt_file)
