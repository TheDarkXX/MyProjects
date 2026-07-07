import os
import sys
import json
import subprocess
import argparse
from pathlib import Path

# Add current dir to path to import config_loader
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from utils.config_loader import load_channel_config, get_audio, get_style
except ImportError:
    def load_channel_config(): return {}
    def get_audio(c, s, k, d=None): return d
    def get_style(c, s, k, d=None): return d

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
    config = load_channel_config()
    
    # Resolve SFX Directory from config (new nested → fallback to old flat)
    sfx_dir = get_audio(config, "sfx", "library") or config.get("sfx_library", r"V:\DoctorBank Family\DoctorBank Brand\Sound Effect")
    if not os.path.isabs(sfx_dir):
        sfx_dir = str(Path(__file__).parent.parent / sfx_dir)
        
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
                            
                            # Create transition placeholder via CLI (08b-auto-style will swap to Minnie: Zoom Shake, Get Closer etc.)
                            if seg_id and start_time > 0.1:
                                print(f"Adding transition placeholder for B-Roll {seg_id} at {start_time}s")
                                run_capcut_cli(["transition", str(project_path), seg_id, "glitch", "--duration", "0.7"])
                                
                                # Add dynamic transition sound effect
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

    # 3. Inject 3-Stage BGM System (AI Turning Point + J-Cut)
    print(f"\n--- Injecting 3-Stage BGM System ---")
    bgm_dir = get_audio(config, "bgm", "library") or config.get("bgm_library", r"V:\DoctorBank Family\DoctorBank Brand\BGM")
    
    # 3.1 Calculate Turning Point from scene_table.json
    turning_point_sec = 12.0 # fallback
    scene_table_file = job_path / "scene_table.json"
    if scene_table_file.exists():
        try:
            with open(scene_table_file, "r", encoding="utf-8") as f:
                scenes = json.load(f)
                
            for i, scene in enumerate(scenes):
                sub_text = scene.get("subtitle_text", "")
                scene_id = scene.get("id", "")
                
                # Check for keywords or fallback to S02
                if any(kw in sub_text for kw in ["ข้อ 1", "ข้อที่ 1", "วิธีที่ 1", "ลดความเสี่ยง", "สัญญาณเตือน"]) or scene_id == "S02":
                    turning_point_sec = float(scene.get("start", turning_point_sec))
                    print(f"Turning Point detected at {turning_point_sec}s (Scene {scene_id})")
                    break
        except Exception as e:
            print(f"Warning: Could not read turning point from scene_table.json: {e}")
            
    # 3.2 Define Stage Timings with J-Cut (1.5s overlap)
    # Stage 1 duration = turning_point, will fade out in the last 1.5s (from turning_point - 1.5 to turning_point)
    # Stage 2 starts at turning_point - 1.5, will fade in over 1.5s
    stage2_start = max(0.0, turning_point_sec - 1.5)
    stage3_start = max_time - 10.0
    stage2_duration = max(0.0, stage3_start - stage2_start)
    
    stage_bgms = {
        "stage1": (os.path.join(bgm_dir, get_audio(config, "bgm", "stage1") or config.get("bgm_stage1", "bgm_hook_clockwork_1.mp3")), 0.0, turning_point_sec, get_audio(config, "bgm", "stage1_vol") or 0.15),
        "stage2": (os.path.join(bgm_dir, get_audio(config, "bgm", "stage2") or config.get("bgm_stage2", "bgm_edu_focus_1.mp3")), stage2_start, stage2_duration, get_audio(config, "bgm", "stage2_vol") or 0.15),
        "stage3": (os.path.join(bgm_dir, get_audio(config, "bgm", "stage3") or config.get("bgm_stage3", "bgm_hype_sigma_1.mp3")), stage3_start, 15.0, get_audio(config, "bgm", "stage3_vol") or 0.18)
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

    # 4. Inject Big Header Text
    print(f"\n--- Injecting Big Header Text ---")
    header_file = job_path / "header.txt"
    if header_file.exists():
        header_text = header_file.read_text(encoding="utf-8").strip()
    else:
        header_text = get_style(config, "header", "default_text") or config.get("default_header_text", "คลิปความรู้สุขภาพ")
        
    header_color = get_style(config, "header", "color", "#FFE600")
    header_size = get_style(config, "header", "font_size", 14.5)
    
    success, stdout = run_capcut_cli([
        "add-text",
        str(project_path),
        "0.0",
        str(max_time + 5.0),
        header_text,
        "--y", "0.32",
        "--font-size", str(header_size),
        "--color", header_color,
        "--track-name", "Header Title"
    ])

    print(f"\n--- Running Post-Styling & Layout adjustments ---")
    try:
        import importlib.util
        import sys
        script_dir = os.path.dirname(os.path.abspath(__file__))
        if script_dir not in sys.path:
            sys.path.append(script_dir)
            
        spec = importlib.util.spec_from_file_location("capcut_style", os.path.join(script_dir, "10b-capcut-auto-style.py"))
        capcut_style = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(capcut_style)
        
        # Determine draft_content path
        draft_path = os.path.join(project_path, 'template-2.tmp')
        if not os.path.exists(draft_path):
            draft_path = os.path.join(project_path, 'draft_content.json')
            
        capcut_style.style_capcut_project(draft_path, job_dir)
    except Exception as e:
        print(f"Warning: Layout auto-styling failed: {e}")

    # 5. Prune unused materials
    print(f"\n--- Pruning unused materials ---")
    run_capcut_cli(["prune", str(project_path)])
    
    # 6. Lint check
    print(f"\n--- Running Lint QA ---")
    subtitle_max = config.get("style", {}).get("subtitle", {}).get("max_chars", 15)
    success, lint_out = run_capcut_cli(["lint", str(project_path), "--max-chars", str(subtitle_max)])
    if not success:
        print(f"⚠️ Lint issues found — check manually")

    print("\n✅ CapCut Injection Complete!")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("job_dir", help="Path to job directory")
    parser.add_argument("--project", help="Path to CapCut project folder", default=None)
    args = parser.parse_args()
    
    proj_dir = args.project if args.project else args.job_dir
    
    if not os.path.exists(proj_dir):
        print(f"Error: CapCut project path does not exist: {proj_dir}")
        sys.exit(1)
        
    success = inject_elements(args.job_dir, proj_dir)
    if not success:
        sys.exit(1)
