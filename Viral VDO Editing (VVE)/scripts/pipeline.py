import os
import sys
import subprocess
import argparse
import json
from pathlib import Path

# STAGES defines the order of execution
STAGES = [
    ("02-extract-audio.py",    "EXTRACT_AUDIO"),
    ("03-transcribe.py",       "TRANSCRIBE"),
    ("04-editorial-agent.py", "EDITORIAL_AGENT"),
    ("04b-apply-editorial-cuts.py", "APPLY_EDITORIAL_CUTS"),
    ("05-word-segment.py",     "WORD_SEGMENT"),
    # --- PAUSE: Wait for AI Refiner (AG/LLM) to write ai_segmented.txt ---
    ("05b-align-ai.py",        "ALIGN_AI_TEXT"),
    ("06-generate-srt.py",     "GENERATE_SRT"),
    ("07a-scene-analyzer.py",  "SCENE_ANALYZE"),     # AI: Analyze role/emphasis/pacing
    ("07b-scene-splitter.py",  "SCENE_SPLIT"),        # AI: Assign A-Roll / B-Roll
    ("07c-broll-prompt.py",    "BROLL_PROMPT"),        # Generate B-Roll prompt MD
    # --- PAUSE: User runs God Flow ---
    ("08-footage-assembler.py","FOOTAGE_ASSEMBLY"),
    ("09-sfx-placer.py",       "SFX_PLACEMENT"),
    ("10-capcut-inject.py",    "CAPCUT_INJECT"),
    ("10b-capcut-auto-style.py", "CAPCUT_STYLE"),
    ("10c-aroll-zoom.py",      "AROLL_ZOOM"),
    ("11-qa-recheck.py",       "QA_RECHECK"),         # Gate: Fails if missing elements
    ("12-viral-score.py",      "VIRAL_SCORE"),
]

def get_checkpoint_path(job_dir):
    return os.path.join(job_dir, "checkpoint.json")

def load_checkpoints(job_dir):
    ckpt_file = get_checkpoint_path(job_dir)
    if os.path.exists(ckpt_file):
        with open(ckpt_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_checkpoint(job_dir, stage_name):
    ckpt = load_checkpoints(job_dir)
    ckpt[stage_name] = True
    ckpt_file = get_checkpoint_path(job_dir)
    with open(ckpt_file, 'w', encoding='utf-8') as f:
        json.dump(ckpt, f, indent=4)

def run_stage(script_name, job_dir):
    script_path = os.path.join(os.path.dirname(__file__), script_name)
    if not os.path.exists(script_path):
        print(f"❌ Error: Script {script_name} not found.")
        sys.exit(1)
    
    print(f"\n▶️ Running {script_name}...")
    result = subprocess.run([sys.executable, script_path, job_dir])
    
    if result.returncode != 0:
        if result.returncode == 100:
            print(f"⏸️ PAUSED at {script_name}. Run with --resume later.")
            sys.exit(100)
        else:
            print(f"❌ FAILED at {script_name} (Exit code: {result.returncode})")
            sys.exit(result.returncode)
    
    return True

def main():
    parser = argparse.ArgumentParser(description="VVE Video Processing Pipeline")
    parser.add_argument("job_dir", help="Path to the job directory")
    parser.add_argument("--resume", action="store_true", help="Resume from last checkpoint")
    parser.add_argument("--channel", help="Channel name for config (default: doctorbank)", default="doctorbank")
    parser.add_argument("--auto-silence", action="store_true", help="Use auto-editor instead of Timebolt for silence removal")
    args = parser.parse_args()

    job_dir = args.job_dir
    if not os.path.exists(job_dir):
        print(f"❌ Job directory not found: {job_dir}")
        sys.exit(1)

    os.environ["VVE_CHANNEL"] = args.channel
    print(f"🚀 Starting VVE Pipeline for job: {job_dir} (Channel: {args.channel})")
    
    checkpoints = load_checkpoints(job_dir) if args.resume else {}

    for script, stage_name in STAGES:
        # Check for auto-silence replacement
        if stage_name == "EXTRACT_AUDIO" and args.auto_silence:
            script = "01b-silence-cut.py"
            
        if args.resume and checkpoints.get(stage_name):
            print(f"⏩ Skipped {stage_name} (already completed)")
            continue
        
        run_stage(script, job_dir)
        save_checkpoint(job_dir, stage_name)

    print("\n✅ Pipeline execution finished successfully!")

if __name__ == "__main__":
    main()
