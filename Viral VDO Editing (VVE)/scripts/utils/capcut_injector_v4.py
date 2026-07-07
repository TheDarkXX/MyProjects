"""
capcut_injector_v4.py — Uses capcut-cli as the backend.
Instead of hand-crafting JSON, we generate an SRT file from editorial_result.json
and use `capcut import-srt` to inject subtitles properly.
"""
import json
import os
import subprocess
import sys

MICROSECONDS = 1_000_000
LIVE_PROJECT = r"C:\Users\Admin\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\Live"

def us_to_srt_time(us):
    """Convert microseconds to SRT timestamp format: HH:MM:SS,mmm"""
    ms = us // 1000
    h = ms // 3600000
    ms %= 3600000
    m = ms // 60000
    ms %= 60000
    s = ms // 1000
    ms %= 1000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def seconds_to_srt_time(secs):
    """Convert seconds to SRT timestamp format: HH:MM:SS,mmm"""
    total_ms = int(secs * 1000)
    h = total_ms // 3600000
    total_ms %= 3600000
    m = total_ms // 60000
    total_ms %= 60000
    s = total_ms // 1000
    ms = total_ms % 1000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def generate_srt(subtitles, output_path):
    """Generate an SRT file from subtitle data."""
    lines = []
    for i, sub in enumerate(subtitles, 1):
        start = seconds_to_srt_time(sub['start'])
        end = seconds_to_srt_time(sub['end'])
        text = sub['text'].strip()
        lines.append(f"{i}")
        lines.append(f"{start} --> {end}")
        lines.append(text)
        lines.append("")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"Generated SRT with {len(subtitles)} cues: {output_path}")

def run_capcut_cli(args, cwd=None):
    """Run a capcut-cli command."""
    cmd = ["npx", "capcut-cli"] + args
    print(f"  Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd, shell=True)
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr or result.stdout}")
    else:
        print(f"  OK: {result.stdout[:200] if result.stdout else '(no output)'}")
    return result

def main():
    # Load editorial data
    with open('editorial_result.json', 'r', encoding='utf-8') as f:
        edit_data = json.load(f)
    
    # 1. Generate SRT from subtitles
    srt_path = os.path.join(os.getcwd(), 'subtitles_for_capcut.srt')
    if edit_data.get('subtitles'):
        generate_srt(edit_data['subtitles'], srt_path)
    
    # 2. Import SRT using capcut-cli
    print("\n--- Importing SRT into CapCut project ---")
    result = run_capcut_cli([
        "import-srt", LIVE_PROJECT, srt_path,
        "--font-size", "15",
        "--y", "-0.32",
    ])
    
    # 3. Run lint to verify
    print("\n--- Running lint ---")
    run_capcut_cli(["lint", LIVE_PROJECT])
    
    print("\nDone! Open CapCut and check the Live project.")

if __name__ == "__main__":
    main()
