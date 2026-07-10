import json
import sys
from pathlib import Path

def place_sfx(transcript_path: str, manifest_path: str, capcut_project: str):
    """
    Scans the raw ElevenLabs transcript for trigger keywords,
    aligns SFX peaks with word start times, and generates capcut-cli commands.
    """
    with open(transcript_path, 'r', encoding='utf-8') as f:
        transcript = json.load(f)
        
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
        
    words = transcript.get("words", [])
    if not words:
        print("Error: No character/word data in transcript.")
        sys.exit(1)
        
    # Reconstruct whole words from character-level JSON for matching
    # ElevenLabs Scribe Thai outputs chars. We need to group them by actual spoken words loosely,
    # or just match substrings and use the timestamp of the first char of the substring.
    full_text = "".join([w["text"] for w in words])
    
    commands = []
    
    for sfx in manifest:
        keywords = sfx.get("trigger_keywords", [])
        if not keywords:
            continue
            
        peak_offset_sec = sfx.get("peak_offset_ms", 0) / 1000.0
        file_path = sfx["file"]
        vol = sfx.get("volume_default", 0.3)
        
        for keyword in keywords:
            # Find keyword in the full text
            start_idx = 0
            while True:
                idx = full_text.find(keyword, start_idx)
                if idx == -1:
                    break
                    
                # The word starts at character index `idx`.
                # Get the start timestamp of that character
                char_start_time = words[idx]["start"]
                
                # Apply peak offset
                sfx_start = char_start_time - peak_offset_sec
                if sfx_start < 0:
                    sfx_start = 0
                    
                # Generate capcut-cli command
                capcut_start = int(sfx_start * 1_000_000)
                cmd = f'capcut-cli add-audio --project "{capcut_project}" --file "{Path(manifest_path).parent / file_path}" --start {capcut_start} --volume {vol}'
                commands.append(cmd)
                
                print(f"Matched '{keyword}' at {char_start_time}s -> placing {Path(file_path).name} at {sfx_start:.3f}s")
                
                # Move past this keyword to find next occurrences
                start_idx = idx + len(keyword)
                
    # Output execution script
    out_script = Path("inject_sfx.bat")
    with open(out_script, "w", encoding="utf-8") as f:
        f.write("@echo off\n")
        for cmd in commands:
            f.write(cmd + "\n")
            
    print(f"\nSFX Placement complete! {len(commands)} sound effects matched.")
    print(f"Run {out_script.name} to inject into CapCut.")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python sfx_placer.py <transcript.json> <sfx_manifest.json> <capcut_project_path>")
        sys.exit(1)
        
    place_sfx(sys.argv[1], sys.argv[2], sys.argv[3])
