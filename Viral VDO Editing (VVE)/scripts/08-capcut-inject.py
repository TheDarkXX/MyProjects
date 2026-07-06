import os
import sys
import json
import subprocess
import argparse
from pathlib import Path

def run_capcut_cli(command_list):
    """Executes a capcut-cli command and returns (success, stdout)."""
    print(f"Running: npx capcut-cli {' '.join(command_list)}")
    try:
        result = subprocess.run(
            ["npx", "capcut-cli"] + command_list,
            check=True,
            capture_output=True,
            text=True,
            shell=True,
            encoding="utf-8"
        )
        stdout_str = result.stdout.strip()
        print(f"Success: {stdout_str}")
        return True, stdout_str
    except subprocess.CalledProcessError as e:
        print(f"CLI Error: {e.stderr.strip()}")
        return False, e.stderr.strip()
    except FileNotFoundError:
        print("Error: npx capcut-cli not found in system PATH.")
        return False, ""

def inject_elements(job_dir, project_path):
    job_path = Path(job_dir)
    inter_path = job_path / "intermediates"
    
    # 1. Inject SRT Subtitles
    srt_file = inter_path / "subtitles.srt"
    if srt_file.exists():
        print(f"\n--- Injecting Subtitles ---")
        success, _ = run_capcut_cli(["import-srt", str(project_path), str(srt_file)])
        if not success:
            return False
    else:
        print(f"Warning: SRT file not found at {srt_file}")
        
    # 2. Inject Footage & SFX via timeline_commands.json
    commands_file = inter_path / "timeline_commands.json"
    max_time = 135.0  # default duration fallback
    
    if commands_file.exists():
        print(f"\n--- Injecting Footage & SFX ---")
        try:
            with open(commands_file, 'r', encoding='utf-8') as f:
                commands = json.load(f)
                
            for cmd in commands:
                cmd_name = cmd[0]
                cmd_options = cmd[1:]
                cmd_args = [cmd_name, str(project_path)] + cmd_options
                success, stdout = run_capcut_cli(cmd_args)
                
                # Get the end time of the last element to calculate project duration
                if cmd_name == "add-video" and len(cmd_options) >= 3:
                    try:
                        start_t = float(cmd_options[1])
                        dur_t = float(cmd_options[2])
                        if start_t + dur_t > max_time:
                            max_time = start_t + dur_t
                    except ValueError:
                        pass
                
                if success:
                    # If it's a video segment, add a visual transition and a transition whoosh sound!
                    if cmd_name == "add-video":
                        try:
                            res_json = json.loads(stdout)
                            seg_id = res_json.get("segment_id")
                            start_time = float(cmd_options[1]) # The start position on the timeline
                            
                            # Apply Glitch transition between B-Rolls (if not the absolute start)
                            if seg_id and start_time > 0.1:
                                print(f"Adding glitch transition to B-Roll {seg_id} at {start_time}s")
                                run_capcut_cli(["transition", str(project_path), seg_id, "glitch", "--duration", "0.3"])
                                
                                # Add dynamic transition sound effect
                                sfx_dir = r"V:\DoctorBank Family\DoctorBank Brand\Sound Effect"
                                import random
                                trans_sfx_pool = []
                                if os.path.exists(sfx_dir):
                                    for f in os.listdir(sfx_dir):
                                        fname = f.lower()
                                        if fname.endswith('.wav') or fname.endswith('.mp3'):
                                            if 'whoosh' in fname or 'swoosh' in fname or 'slide' in fname or 'sweep' in fname:
                                                trans_sfx_pool.append(os.path.join(sfx_dir, f))
                                                
                                whoosh_path = random.choice(trans_sfx_pool) if trans_sfx_pool else os.path.join(sfx_dir, "sfx_whoosh.wav")
                                
                                if os.path.exists(whoosh_path):
                                    print(f"Adding transition SFX ({os.path.basename(whoosh_path)}) at {start_time}s")
                                    run_capcut_cli([
                                        "add-audio",
                                        str(project_path),
                                        whoosh_path,
                                        str(start_time),
                                        "0.8",
                                        "--volume", "0.25",
                                        "--track-name", "Transition SFX"
                                    ])
                        except Exception as e:
                            print(f"Warning: Could not add transition or whoosh: {e}")
                else:
                    print(f"Warning: Failed to execute timeline command: {cmd}")
        except Exception as e:
            print(f"Error parsing timeline_commands.json: {e}")
            return False
    else:
        print(f"Warning: timeline_commands.json not found at {commands_file}")

    # 3. Inject 3-Stage BGM System
    print(f"\n--- Injecting 3-Stage BGM System ---")
    bgm_dir = r"V:\DoctorBank Family\DoctorBank Brand\BGM"
    stage_bgms = {
        "stage1": (os.path.join(bgm_dir, "bgm_hook_clockwork_1.mp3"), 0.0, 12.0, 0.15),
        "stage2": (os.path.join(bgm_dir, "bgm_edu_focus_1.mp3"), 12.0, max(0.0, max_time - 22.0), 0.15),
        "stage3": (os.path.join(bgm_dir, "bgm_hype_sigma_1.mp3"), max_time - 10.0, 15.0, 0.18)
    }
    
    for stage, (bgm_file, start, dur, vol) in stage_bgms.items():
        if os.path.exists(bgm_file):
            print(f"Injecting {stage}: {os.path.basename(bgm_file)} at {start}s ({dur}s)")
            success, stdout = run_capcut_cli([
                "add-audio",
                str(project_path),
                bgm_file,
                str(start),
                str(dur),
                "--volume", str(vol),
                "--track-name", "Background Music"
            ])
            if success:
                # Apply Audio Fades for seamless transition
                try:
                    res_json = json.loads(stdout)
                    seg_id = res_json.get("segment_id")
                    if seg_id:
                        fade_in = 1.5 if stage in ["stage2", "stage3"] else 0.0
                        fade_out = 1.5 if stage in ["stage1", "stage2"] else 1.0
                        run_capcut_cli([
                            "audio-fade",
                            str(project_path),
                            seg_id,
                            "--in", str(fade_in),
                            "--fade-out", str(fade_out)
                        ])
                except Exception as e:
                    print(f"Warning: Could not apply fade to BGM {stage}: {e}")
        else:
            print(f"Warning: BGM file not found: {bgm_file}")

    # 4. Inject Big Header Text (93.7 สุดยอดอาหารบำรุงไต)
    print(f"\n--- Injecting Big Header Text ---")
    header_text = "93.7 สุดยอดอาหารบำรุงไต"
    success, stdout = run_capcut_cli([
        "add-text",
        str(project_path),
        "0.0",
        str(max_time + 5.0),
        header_text,
        "--y", "0.32",       # top position
        "--font-size", "14.5",
        "--color", "#FFE600", # Yellow
        "--track-name", "Header Title"
    ])
    if success:
        try:
            pass
        except Exception as e:
            print(f"Warning: Could not style header text: {e}")

    # 5. Run Auto Styling & Post-processing
    print(f"\n--- Running Post-Styling & Layout adjustments ---")
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("capcut_style", "scripts/08b-capcut-auto-style.py")
        capcut_style = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(capcut_style)
        capcut_style.style_capcut_project(os.path.join(project_path, 'draft_content.json'))
    except Exception as e:
        print(f"Warning: Layout auto-styling failed: {e}")

    print("\nCapCut Injection Complete!")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("job_dir", help="Path to job directory")
    parser.add_argument("--project", help="Path to CapCut project folder (required)", required=True)
    args = parser.parse_args()
    
    if not os.path.exists(args.project):
        print(f"Error: CapCut project path does not exist: {args.project}")
        sys.exit(1)
        
    success = inject_elements(args.job_dir, args.project)
    if not success:
        sys.exit(1)
