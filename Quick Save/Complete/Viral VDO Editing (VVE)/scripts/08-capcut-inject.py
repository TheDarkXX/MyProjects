import os
import sys
import json
import subprocess
import argparse
from pathlib import Path

def run_capcut_cli(command_list):
    """Executes a capcut-cli command and checks the result."""
    print(f"Running: capcut-cli {' '.join(command_list)}")
    try:
        result = subprocess.run(
            ["capcut-cli"] + command_list,
            check=True,
            capture_output=True,
            text=True
        )
        print(f"✅ Success: {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ CLI Error: {e.stderr.strip()}")
        return False
    except FileNotFoundError:
        print("❌ Error: capcut-cli not found in system PATH.")
        return False

def inject_elements(job_dir, project_path):
    job_path = Path(job_dir)
    inter_path = job_path / "intermediates"
    
    # 1. Inject SRT Subtitles
    srt_file = inter_path / "subtitles.srt"
    if srt_file.exists():
        print(f"\n--- Injecting Subtitles ---")
        success = run_capcut_cli(["import-srt", "--project", str(project_path), "--file", str(srt_file)])
        if not success:
            return False
    else:
        print(f"⚠️ Warning: SRT file not found at {srt_file}")
        
    # 2. Inject Footage & SFX via timeline_commands.json
    commands_file = inter_path / "timeline_commands.json"
    if commands_file.exists():
        print(f"\n--- Injecting Footage & SFX ---")
        try:
            with open(commands_file, 'r', encoding='utf-8') as f:
                commands = json.load(f)
                
            for cmd in commands:
                # cmd is a list of arguments for capcut-cli, e.g., ["add-video", "--file", "broll.mp4", "--track", "2"]
                cmd_args = cmd + ["--project", str(project_path)]
                success = run_capcut_cli(cmd_args)
                if not success:
                    print(f"⚠️ Warning: Failed to execute timeline command: {cmd}")
        except Exception as e:
            print(f"❌ Error parsing timeline_commands.json: {e}")
            return False
    else:
        print(f"⚠️ Warning: timeline_commands.json not found at {commands_file}")

    print("\n✅ CapCut Injection Complete!")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("job_dir", help="Path to job directory")
    parser.add_argument("--project", help="Path to CapCut project folder (required)", required=True)
    args = parser.parse_args()
    
    if not os.path.exists(args.project):
        print(f"❌ Error: CapCut project path does not exist: {args.project}")
        sys.exit(1)
        
    success = inject_elements(args.job_dir, args.project)
    if not success:
        sys.exit(1)
