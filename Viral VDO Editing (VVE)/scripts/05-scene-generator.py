import json
import sys
from pathlib import Path
from typing import List, Dict
import os

# Add current dir to path to import config_loader
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from config_loader import load_channel_config
except ImportError:
    def load_channel_config(): return {}

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
        
    # Determine prompt mode from channel config
    config = load_channel_config()
    prompt_mode = config.get("prompt_mode", "video")  # "video" or "image"
    
    if prompt_mode == "video":
        masterprompt_file = "doctorbank_broll_text2video.yaml"
        columns = "`Scene ID` | `Subtitle` | `Scene Story` | `Category` | `Video Prompt`"
        critical_rule = "> **CRITICAL RULE:** For `Video Prompt`, you MUST wrap the Scene ID at the very beginning like this: `[S01] Premium food photography, slow dolly...`"
    else:
        masterprompt_file = "doctorbank_broll_image+motion.yaml"
        columns = "`Scene ID` | `Subtitle` | `Scene Story` | `Category` | `Image Prompt` | `Motion Prompt`"
        critical_rule = "> **CRITICAL RULE:** For both `Image Prompt` and `Motion Prompt`, you MUST wrap the Scene ID at the very beginning like this: `[S01] Premium food...` or `[S01] Slow pan...`"

    # Output MD for user to paste to AG
    out_md = path.with_name("scene_table.md")
    with open(out_md, 'w', encoding='utf-8') as f:
        f.write("# Scene Table\n\n")
        f.write(f"Please act as the AI Art Director. Read the `{masterprompt_file}` to understand the 8 Categories.\n")
        f.write(f"Then, analyze the following scenes and generate a **TSV Table** containing the following columns:\n")
        f.write(f"{columns}\n\n")
        f.write(f"{critical_rule}\n\n")
        f.write("Do NOT output JSON. Output the raw TSV inside a markdown code block so I can copy-paste to Excel.\n\n")
        f.write("```json\n")
        json.dump(scenes, f, ensure_ascii=False, indent=2)
        f.write("\n```\n")
        
    print(f"Generated {len(scenes)} scenes. (prompt_mode: {prompt_mode})")
    print(f"Saved to {out_json.name} and {out_md.name}")
    print("Next step: Paste the contents of scene_table.md to AG to get your Master Prompts.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python 05-scene-generator.py <job_dir>")
        sys.exit(1)
        
    job_dir = sys.argv[1]
    
    # Try to find the grouped JSON file in the job_dir
    json_files = list(Path(job_dir).glob("*.transcript.grouped.json"))
    if not json_files:
        print(f"❌ Error: No .transcript.grouped.json found in {job_dir}")
        sys.exit(1)
        
    json_path = str(json_files[0])
    
    config = load_channel_config()
    target_dur = config.get("scene_duration_sec", 3.5)
    
    generate_scenes(json_path, target_duration_sec=target_dur)
