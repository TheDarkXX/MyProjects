import json
import os
import sys
import numpy as np
from pathlib import Path
try:
    from pydub import AudioSegment
except ImportError:
    print("Error: pydub is not installed. Run: pip install pydub numpy")
    sys.exit(1)

def analyze_sfx_directory(sfx_dir: str):
    """
    Scans a directory for audio files, finds the peak amplitude offset,
    and generates/updates an sfx_manifest.json file.
    """
    root_dir = Path(sfx_dir)
    if not root_dir.exists() or not root_dir.is_dir():
        print(f"Error: {root_dir} is not a valid directory.")
        sys.exit(1)
        
    manifest_path = root_dir / "sfx_manifest.json"
    manifest = []
    
    # Load existing manifest to preserve manual fields like trigger_keywords
    existing_data = {}
    if manifest_path.exists():
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                old_manifest = json.load(f)
                for item in old_manifest:
                    existing_data[item["file"]] = item
        except Exception as e:
            print(f"Warning: Could not parse existing manifest: {e}")
            
    print(f"Scanning for audio files in {root_dir}...")
    audio_extensions = {".mp3", ".wav", ".m4a"}
    
    for file_path in root_dir.rglob("*"):
        if file_path.suffix.lower() in audio_extensions:
            rel_path = file_path.relative_to(root_dir).as_posix()
            
            # Analyze peak
            try:
                audio = AudioSegment.from_file(file_path)
                samples = np.array(audio.get_array_of_samples())
                if len(samples) > 0:
                    peak_sample = np.argmax(np.abs(samples))
                    peak_ms = int((peak_sample / audio.frame_rate) * 1000)
                    duration_ms = len(audio)
                else:
                    peak_ms = 0
                    duration_ms = 0
                    
                print(f"Analyzed {rel_path}: peak at {peak_ms}ms, total {duration_ms}ms")
                
                # Merge with existing data
                entry = existing_data.get(rel_path, {})
                entry["file"] = rel_path
                entry["name"] = entry.get("name", file_path.stem.replace("-", " ").title())
                entry["category"] = entry.get("category", file_path.parent.name)
                entry["duration_ms"] = duration_ms
                entry["peak_offset_ms"] = peak_ms
                entry["volume_default"] = entry.get("volume_default", 0.3)
                entry["trigger_keywords"] = entry.get("trigger_keywords", [])
                entry["peak_type"] = entry.get("peak_type", "impact_word")
                
                manifest.append(entry)
                
            except Exception as e:
                print(f"Failed to analyze {file_path.name}: {e}")
                
    # Save manifest
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        
    print(f"\nSuccessfully generated {manifest_path.name} with {len(manifest)} entries.")
    print("You can now manually edit the `trigger_keywords` in the JSON.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python sfx_analyzer.py <path_to_sfx_library>")
        sys.exit(1)
        
    analyze_sfx_directory(sys.argv[1])
