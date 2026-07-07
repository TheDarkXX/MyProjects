import json
import sys
import os
import random
from pathlib import Path

# Add current dir to path to import config_loader
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from utils.config_loader import load_channel_config, get_audio
except ImportError:
    def load_channel_config(): return {}
    def get_audio(c, s, k, d): return d

def place_sfx(job_dir: str):
    job_path = Path(job_dir)
    transcript_files = list(job_path.glob("*.transcript.json"))
    if not transcript_files:
        print(f"Error: No .transcript.json found in {job_dir}")
        sys.exit(1)
    transcript_path = transcript_files[0]
    config = load_channel_config()
    
    sfx_dir_path = get_audio(config, "sfx", "library", r"V:\DoctorBank Family\DoctorBank Brand\Sound Effect")
    if not os.path.isabs(sfx_dir_path):
        sfx_dir_path = str(Path(__file__).parent.parent / sfx_dir_path)
    sfx_dir = Path(sfx_dir_path)
        
    manifest_path = sfx_dir / "sfx_manifest.json"
    
    with open(transcript_path, 'r', encoding='utf-8') as f:
        transcript = json.load(f)
        
    manifest = []
    if manifest_path.exists():
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
            
    words = transcript.get("words", [])
    if not words:
        print("Error: No character/word data in transcript.")
        sys.exit(1)
        
    full_text = "".join([w["text"] for w in words])
    
    inter_path = job_path / "intermediates"
    inter_path.mkdir(exist_ok=True)
    commands_file = inter_path / "timeline_commands.json"
    
    if commands_file.exists():
        with open(commands_file, 'r', encoding='utf-8') as f:
            try:
                commands = json.load(f)
            except:
                commands = []
    else:
        commands = []
        
    new_cmds_count = 0
    
    def get_audio_duration(file_path):
        if str(file_path).lower().endswith('.wav'):
            import wave
            try:
                with wave.open(str(file_path), 'rb') as w:
                    return w.getnframes() / float(w.getframerate())
            except: pass
        return 1.0

    # Read config volumes and cooldowns
    hook_vol = get_audio(config, "sfx", "hook_impact_vol", 0.5)
    whoosh_vol = get_audio(config, "sfx", "whoosh_vol", 0.25)
    emphasis_vol = get_audio(config, "sfx", "emphasis_vol", 0.4)
    
    cooldowns = get_audio(config, "sfx", "cooldowns", {
        "hook": 0, "whoosh": 2.0, "point": 3.0, "emphasis": 1.5, "emotion": 5.0, "cta": 0
    })
    global_min_gap = get_audio(config, "sfx", "global_min_gap", 0.3)
    
    last_played = {cat: -999.0 for cat in cooldowns.keys()}
    last_global_play = -999.0
    last_file_played = {cat: "" for cat in cooldowns.keys()}
    
    def add_sfx_cmd(sound_file, start_sec, vol, category="default"):
        nonlocal new_cmds_count, last_global_play
        
        # Check global gap
        if start_sec - last_global_play < global_min_gap:
            return False
            
        full_path = sfx_dir / sound_file
        if full_path.exists():
            cmd = ["add-audio", str(full_path.absolute()), str(start_sec), str(get_audio_duration(full_path)), "--volume", str(vol)]
            commands.append(cmd)
            new_cmds_count += 1
            last_global_play = start_sec
            last_played[category] = start_sec
            last_file_played[category] = sound_file
            print(f"Placed [{category}] {sound_file} at {start_sec:.3f}s")
            return True
        return False
        
    # Group manifest by category
    pools = {cat: [] for cat in cooldowns.keys()}
    for item in manifest:
        cat = item.get("category", "emphasis")
        if cat in pools:
            pools[cat].append(item)
            
    def get_random_sfx(category):
        pool = pools.get(category, [])
        if not pool: return None
        if len(pool) == 1: return pool[0]
        
        # Shuffle and avoid last played if possible
        available = [item for item in pool if item["file"] != last_file_played.get(category, "")]
        if not available: available = pool
        return random.choice(available)

    # ---------------------------------------------------------
    # LAYER 1: Hook Impact (Always at 0.0s)
    # ---------------------------------------------------------
    hook_sfx = get_random_sfx("hook")
    if hook_sfx:
        add_sfx_cmd(hook_sfx["file"], 0.0, hook_vol, "hook")

    # ---------------------------------------------------------
    # LAYER 2: Scene Whoosh (From scene_table.json)
    # ---------------------------------------------------------
    scene_table_path = job_path / "scene_table.json"
    if scene_table_path.exists():
        with open(scene_table_path, "r", encoding="utf-8") as f:
            scenes = json.load(f)
            
        for i, scene in enumerate(scenes):
            if i == 0: continue # Skip first scene (hook covers it)
            scene_start = scene["start"]
            
            if scene_start - last_played["whoosh"] >= cooldowns["whoosh"]:
                whoosh_sfx = get_random_sfx("whoosh")
                if whoosh_sfx:
                    # Place whoosh slightly before cut for better flow
                    add_sfx_cmd(whoosh_sfx["file"], max(0, scene_start - 0.1), whoosh_vol, "whoosh")

    # ---------------------------------------------------------
    # LAYER 3, 4, 5, 6: Transcript Scan (Point, Emphasis, Emotion, CTA)
    # ---------------------------------------------------------
    # Build character to start time mapping
    char_start_times = []
    for w in words:
        for _ in w["text"]:
            char_start_times.append(w["start"])
            
    total_time = words[-1]["start"] + 1.0 if words else 0.0

    for sfx_item in manifest:
        cat = sfx_item.get("category", "emphasis")
        if cat in ["hook", "whoosh"]: continue # Handled above
        
        keywords = sfx_item.get("trigger_keywords", [])
        file_path = sfx_item["file"]
        
        # Override volume based on category defaults
        vol = emphasis_vol
        if cat == "point": vol = 0.5
        elif cat == "emotion": vol = 0.5
        elif cat == "cta": vol = 0.5
        elif cat == "emphasis": vol = emphasis_vol
        
        for kw in keywords:
            start_idx = 0
            while True:
                idx = full_text.find(kw, start_idx)
                if idx == -1: break
                
                if idx < len(char_start_times):
                    sfx_start = char_start_times[idx]
                    
                    # Restrict CTA to last 5 seconds
                    if cat == "cta" and (total_time - sfx_start) > 5.0:
                        start_idx = idx + len(kw)
                        continue
                        
                    # Check Cooldown
                    if sfx_start - last_played[cat] >= cooldowns.get(cat, 1.5):
                        # Use offset if defined
                        offset = sfx_item.get("peak_offset_ms", 0) / 1000.0
                        final_start = max(0, sfx_start - offset)
                        
                        add_sfx_cmd(file_path, final_start, vol, cat)
                        
                start_idx = idx + len(kw)

    with open(commands_file, 'w', encoding='utf-8') as f:
        json.dump(commands, f, indent=4, ensure_ascii=False)
            
    print(f"\n6-Layer SFX Engine Complete! Placed {new_cmds_count} new sound effects.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python 09-sfx-placer.py <job_dir>")
        sys.exit(1)
    place_sfx(sys.argv[1])
