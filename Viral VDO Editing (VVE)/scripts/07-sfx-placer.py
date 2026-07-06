import json
import sys
import os
import random
from pathlib import Path

def place_sfx(job_dir: str):
    job_path = Path(job_dir)
    transcript_files = list(job_path.glob("*.transcript.json"))
    if not transcript_files:
        print(f"Error: No .transcript.json found in {job_dir}")
        sys.exit(1)
    transcript_path = transcript_files[0]
        
    sfx_dir = Path(r"V:\DoctorBank Family\DoctorBank Brand\Sound Effect")
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

    def add_sfx_cmd(sound_file, start_sec, vol=0.3):
        nonlocal new_cmds_count
        full_path = sfx_dir / sound_file
        if full_path.exists():
            cmd = ["add-audio", str(full_path.absolute()), str(start_sec), str(get_audio_duration(full_path)), "--volume", str(vol)]
            commands.append(cmd)
            new_cmds_count += 1
            print(f"Placed {sound_file} at {start_sec:.3f}s")
    
    # 1. Manifest Matching
    for sfx in manifest:
        keywords = sfx.get("trigger_keywords", [])
        peak_offset_sec = sfx.get("peak_offset_ms", 0) / 1000.0
        file_path = sfx["file"]
        vol = sfx.get("volume_default", 0.3)
        for kw in keywords:
            start_idx = 0
            while True:
                idx = full_text.find(kw, start_idx)
                if idx == -1: break
                sfx_start = max(0, words[idx]["start"] - peak_offset_sec)
                add_sfx_cmd(file_path, sfx_start, vol)
                start_idx = idx + len(kw)

    # 2. Algorithmic High-Density SFX Engine
    print("Running Algorithmic High-Density SFX Engine...")
    sfx_pools = {
        "pop": [f.name for f in sfx_dir.glob("*.wav") if "pop" in f.name.lower() or "pluck" in f.name.lower()],
        "slide": [f.name for f in sfx_dir.glob("*.wav") if "slide" in f.name.lower() or "swoosh" in f.name.lower()],
        "ding": [f.name for f in sfx_dir.glob("*.wav") if "ding" in f.name.lower() or "bell" in f.name.lower() or "ping" in f.name.lower()]
    }
    
    high_density_kws = {
        "pop": ['ไต', 'แคลเซียม', 'กระดูก', 'โอเมก้า', 'วิตามิน', 'พัง', 'อักเสบ', 'ดีจริง', 'จุก', 'อันตราย', 'เสื่อม', 'สำคัญ'],
        "slide": ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ข้อแรก', 'ข้อที่'],
        "ding": ['สนใจ', 'พิมพ์', 'สั่งซื้อ', 'ตะกร้า', 'คลิก']
    }
    
    for word_obj in words:
        w_text = word_obj["text"]
        w_start = word_obj["start"]
        
        # Check categories
        for cat, kws in high_density_kws.items():
            if any(k in w_text for k in kws):
                if sfx_pools[cat]:
                    add_sfx_cmd(random.choice(sfx_pools[cat]), max(0, w_start - 0.1), vol=0.4)
                break # only one sfx per word
                
    with open(commands_file, 'w', encoding='utf-8') as f:
        json.dump(commands, f, indent=4, ensure_ascii=False)
            
    print(f"\nSFX Placement complete! {new_cmds_count} sound effects placed.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python 07-sfx-placer.py <job_dir>")
        sys.exit(1)
    place_sfx(sys.argv[1])
