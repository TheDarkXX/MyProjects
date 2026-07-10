import json
import sys
from pathlib import Path
from typing import List, Dict

def generate_scenes(transcript_path: str, target_duration_sec: float = 3.5):
    """
    Reads a grouped transcript and chunks it into scenes of approximately `target_duration_sec`.
    Outputs a scene table JSON and MD.
    """
    path = Path(transcript_path)
    if not path.exists():
        print(f"Error: {path} not found.")
        sys.exit(1)
        
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    groups = data.get("groups", [])
    if not groups:
        print("No groups found in transcript.")
        sys.exit(0)
        
    scenes = []
    current_scene_text = []
    current_scene_start = groups[0]["start"]
    current_scene_end = current_scene_start
    
    for group in groups:
        current_scene_text.append(group["text"])
        current_scene_end = group["end"]
        
        duration = current_scene_end - current_scene_start
        if duration >= target_duration_sec:
            # Finalize scene
            scene_id = f"S{len(scenes) + 1:02d}"
            scenes.append({
                "id": scene_id,
                "start": current_scene_start,
                "end": current_scene_end,
                "duration": round(duration, 3),
                "subtitle_text": "".join(current_scene_text)
            })
            # Reset for next scene
            current_scene_text = []
            # We don't have the start of the next group yet, it will be set in the next iteration or here:
            current_scene_start = current_scene_end
            
    # Handle remainder if any
    if current_scene_text:
        scene_id = f"S{len(scenes) + 1:02d}"
        scenes.append({
            "id": scene_id,
            "start": current_scene_start,
            "end": current_scene_end,
            "duration": round(current_scene_end - current_scene_start, 3),
            "subtitle_text": "".join(current_scene_text)
        })
        
    # Output JSON
    out_json = path.with_name("scene_table.json")
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(scenes, f, ensure_ascii=False, indent=2)
        
    # Output MD for user to paste to AG
    out_md = path.with_name("scene_table.md")
    with open(out_md, 'w', encoding='utf-8') as f:
        f.write("# Scene Table\n\n")
        f.write("Please ask AG to generate `scene_story`, `image_prompt`, and `motion_prompt` for these scenes:\n\n")
        f.write("```json\n")
        json.dump(scenes, f, ensure_ascii=False, indent=2)
        f.write("\n```\n")
        
    print(f"Generated {len(scenes)} scenes.")
    print(f"Saved to {out_json.name} and {out_md.name}")
    print("Next step: Paste the contents of scene_table.md to AG to get your Master Prompts.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scene_generator.py <transcript.grouped.json>")
        sys.exit(1)
        
    generate_scenes(sys.argv[1])
