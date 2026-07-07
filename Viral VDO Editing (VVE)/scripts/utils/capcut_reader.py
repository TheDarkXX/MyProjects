import json
import os
import sys
from pathlib import Path
from typing import Dict, Any

def read_capcut_draft(project_path: str) -> None:
    """Reads and summarizes a CapCut draft timeline."""
    proj_dir = Path(project_path)
    
    # CapCut 8.8.0+ uses template-2.tmp for the active timeline. Older versions use draft_content.json
    draft_file = proj_dir / "template-2.tmp"
    if not draft_file.exists():
        draft_file = proj_dir / "draft_content.json"
        
    if not draft_file.exists():
        print(f"Error: Could not find CapCut draft file in {proj_dir}")
        sys.exit(1)
        
    print(f"Reading draft: {draft_file.name}")
    
    try:
        with open(draft_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Failed to parse JSON: {e}")
        sys.exit(1)
        
    # Summarize Tracks
    tracks = data.get("tracks", [])
    print(f"\n--- Timeline Overview ---")
    print(f"Total Tracks: {len(tracks)}")
    
    track_types = {}
    for i, track in enumerate(tracks):
        t_type = track.get("type", "unknown")
        track_types[t_type] = track_types.get(t_type, 0) + 1
        
        segments = track.get("segments", [])
        print(f"Track {i} ({t_type}): {len(segments)} segments")
        
    # Summarize Materials
    materials = data.get("materials", {})
    print(f"\n--- Materials Loaded ---")
    print(f"Videos: {len(materials.get('videos', []))}")
    print(f"Audios: {len(materials.get('audios', []))}")
    print(f"Texts: {len(materials.get('texts', []))}")
    print(f"Stickers: {len(materials.get('stickers', []))}")
    
    # Calculate total duration based on main video track (usually track 0 or first 'video' type)
    main_duration = 0
    for track in tracks:
        if track.get("type") == "video":
            for seg in track.get("segments", []):
                tr = seg.get("target_timerange", {})
                end_time = tr.get("start", 0) + tr.get("duration", 0)
                if end_time > main_duration:
                    main_duration = end_time
                    
    # CapCut durations are in microseconds (1,000,000 = 1 second)
    duration_secs = main_duration / 1_000_000
    print(f"\nTotal Timeline Duration: ~{duration_secs:.2f} seconds")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python capcut_reader.py <capcut_project_folder_path>")
        sys.exit(1)
        
    read_capcut_draft(sys.argv[1])
