import json
import sys
import os
import subprocess
import tempfile
from pathlib import Path
try:
    import cv2
except ImportError:
    print("Error: opencv-python is required for sharpness analysis. Run: pip install opencv-python")
    sys.exit(1)

# Add current dir to path to import capcut_utils
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from utils.capcut_utils import get_project_path, get_draft_path, force_close_capcut
    from utils.snapshot import save_snapshot, restore_snapshot
except ImportError:
    print("❌ Error: Cannot find capcut_utils.py")
    sys.exit(1)

def run_capcut_cli(args):
    cmd = ["npx.cmd", "capcut-cli"] + args
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    if result.returncode != 0:
        print(f"CLI Error: {result.stderr}")
        return False, result.stderr
    print(f"Success: {result.stdout.strip()}")
    return True, result.stdout


def measure_sharpness(image_path: str) -> float:
    """Measures the sharpness of an image using Variance of Laplacian."""
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return 0.0
    return cv2.Laplacian(img, cv2.CV_64F).var()

def find_best_window(video_path: str, target_duration: float, step_sec: float = 0.5) -> float:
    """
    Extracts frames every `step_sec`, measures sharpness, and finds the best 
    continuous window of length `target_duration`. Returns the start time.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Extract frames using ffmpeg at 1/step_sec fps
        fps = 1.0 / step_sec
        capcut_apps = Path(r"C:\Users\Admin\AppData\Local\CapCut\Apps")
        ffmpeg_exe = "ffmpeg"
        if capcut_apps.exists():
            ffmpeg_paths = list(capcut_apps.glob("*/ffmpeg.exe"))
            if ffmpeg_paths:
                ffmpeg_exe = str(sorted(ffmpeg_paths)[-1])
        cmd = [
            ffmpeg_exe, "-y", "-i", video_path, 
            "-vf", f"fps={fps}", 
            "-q:v", "2", 
            os.path.join(temp_dir, "thumb_%04d.jpg")
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Measure sharpness for each frame
        frames = sorted(Path(temp_dir).glob("*.jpg"))
        sharpness_scores = []
        for f in frames:
            sharpness_scores.append(measure_sharpness(str(f)))
            
        if not sharpness_scores:
            return 0.0
            
        # Sliding window to find best average sharpness
        window_size = int(target_duration / step_sec)
        if window_size >= len(sharpness_scores):
            return 0.0  # Video is shorter than target, start from 0
            
        max_avg = -1
        best_start_idx = 0
        for i in range(len(sharpness_scores) - window_size + 1):
            window_avg = sum(sharpness_scores[i:i+window_size]) / window_size
            if window_avg > max_avg:
                max_avg = window_avg
                best_start_idx = i
                
        return best_start_idx * step_sec

def assemble_footage(job_dir: str):
    try:
        project_dir = get_project_path(job_dir)
        draft_path = get_draft_path(job_dir)
        job_path = Path(project_dir)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
        
    print(f"\n==============================================")
    print(f"   08 - FOOTAGE ASSEMBLER (DIRECT INJECT)")
    print(f"==============================================\n")
    
    force_close_capcut()
    
    # Revert to 06 to clear old B-rolls
    if not restore_snapshot(project_dir, draft_path, "06"):
        # We can also revert to "perfect_1" if 06 is missing
        if not restore_snapshot(project_dir, draft_path, "perfect_1"):
            print("❌ Failed to revert to 06 before injecting B-rolls. Make sure 06 has been run.")
            sys.exit(1)
            
    scene_table_path = job_path / "scene_table.json"
    
    # Try looking in specific V: drive path first
    v_drive_clips_dir = Path(r"V:\DoctorBank Family\DoctorBank Brand\Raw Clip") / Path(job_dir).name
    footage_path = v_drive_clips_dir / "VDO footage"
    
    if not footage_path.exists():
        # Try looking in "All Raw Clips" local fallback
        base_dir = Path(__file__).parent.parent.absolute()
        raw_clips_dir = base_dir / "All Raw Clips" / Path(job_dir).name
        footage_path = raw_clips_dir / "VDO footage"
        
    if not footage_path.exists():
        footage_path = raw_clips_dir / "Footage"
        
    if not footage_path.exists():
        # Fallback to capcut project dir
        footage_path = job_path / "Footage"
        
    inter_path = job_path / "intermediates"
    inter_path.mkdir(exist_ok=True)
    
    if not scene_table_path.exists():
        print(f"Error: scene_table.json not found in {job_dir}")
        sys.exit(1)
        
    with open(scene_table_path, 'r', encoding='utf-8') as f:
        scenes = json.load(f)
        
    commands = []
    
    commands_file = inter_path / "timeline_commands.json"
    if commands_file.exists():
        with open(commands_file, 'r', encoding='utf-8') as f:
            try:
                commands = json.load(f)
            except:
                commands = []
                
    new_cmds_count = 0
    
    # Gather potential footage paths (from Footage dir and CapCut imported materials)
    potential_footage = []
    if footage_path.exists():
        potential_footage.extend(list(footage_path.glob("*.mp4")))
        
    meta_path = job_path / "draft_meta_info.json"
    if meta_path.exists():
        try:
            with open(meta_path, 'r', encoding='utf-8') as mf:
                meta = json.load(mf)
                draft_materials = meta.get("draft_materials", [])
                for m in draft_materials:
                    val = m.get("value", m[1] if isinstance(m, list) else m) if isinstance(m, (dict, list)) else m
                    if isinstance(val, list):
                        for v in val:
                            path = v.get("file_Path", "")
                            if path.endswith(".mp4"):
                                potential_footage.append(Path(path))
        except Exception as e:
            print(f"Warning: Could not parse draft_meta_info for imported materials: {e}")
            
    for scene in scenes:
        scene_id = scene["id"]
        target_duration = scene["duration"]
        start_timeline = scene["start"]
        
        # Find matching footage (prefix [S01] or S01)
        matched_file = None
        for file in potential_footage:
            if file.name.startswith(f"[{scene_id}]") or file.name.startswith(f"{scene_id}_"):
                matched_file = file
                break
            
        if not matched_file or not matched_file.exists():
            print(f"Warning: No footage found for {scene_id}. Skipping.")
            continue
            
        print(f"Analyzing {matched_file.name} for {target_duration}s window...")
        
        # Find best trim window
        best_start = find_best_window(str(matched_file), target_duration)
        print(f"  -> Best window starts at {best_start}s")
        
        # Determine timing with L-Cut and padding
        # Read from config if available
        try:
            from utils.config_loader import load_channel_config, get_style
            config = load_channel_config()
            pre_roll = config.get("pacing", {}).get("broll_preroll_sec", 0.15)
            min_dur = config.get("pacing", {}).get("broll_min_duration_sec", 1.5)
        except:
            pre_roll = 0.15
            min_dur = 1.5
            
        capcut_start_timeline = max(0.0, start_timeline - pre_roll)
        capcut_duration = max(min_dur, target_duration + pre_roll + 0.1)
        capcut_media_start = best_start
        
        # Command array for capcut-cli
        cmd_args = [
            "add-video",
            project_dir,
            str(matched_file.absolute()),
            str(capcut_start_timeline),
            str(capcut_duration),
            "--media-start", str(capcut_media_start),
            "--track", "1",
            "--force-write"
        ]
        
        success, stdout = run_capcut_cli(cmd_args)
        if success:
            new_cmds_count += 1
            try:
                res_json = json.loads(stdout)
                seg_id = res_json.get("segment_id")
                if seg_id:
                    # Inject glitch placeholder transition
                    run_capcut_cli(["transition", project_dir, seg_id, "glitch", "--duration", "0.7", "--force-write"])
                    
                    # Add dynamic transition sound effect
                    import random
                    sfx_dir = Path(r"V:\DoctorBank Family\DoctorBank Brand\Sound Effect")
                    trans_sfx_pool = []
                    if sfx_dir.exists():
                        for f in sfx_dir.iterdir():
                            fname = f.name.lower()
                            if fname.endswith('.wav') or fname.endswith('.mp3'):
                                if 'whoosh' in fname or 'swoosh' in fname or 'slide' in fname or 'sweep' in fname:
                                    trans_sfx_pool.append(str(f))
                                    
                    whoosh_path = random.choice(trans_sfx_pool) if trans_sfx_pool else str(sfx_dir / "sfx_whoosh.wav")
                    
                    if os.path.exists(whoosh_path):
                        print(f"Adding transition SFX ({os.path.basename(whoosh_path)}) at {capcut_start_timeline}s")
                        run_capcut_cli([
                            "add-audio", project_dir,
                            whoosh_path,
                            str(capcut_start_timeline), "0.8",
                            "--volume", "0.25",
                            "--track-name", "Transition SFX",
                            "--force-write"
                        ])
            except Exception as e:
                print(f"Warning: Could not add transition or whoosh: {e}")
            
    # Snapshot 08
    save_snapshot(project_dir, draft_path, "08")
    print(f"\nAssembly complete! {new_cmds_count} clips injected into CapCut and step_08 snapshot saved.")

if __name__ == "__main__":
    import os
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
    try:
        from registry import get_active_project, update_step
    except ImportError:
        print("❌ Error: Could not import utils modules.")
        sys.exit(1)
        
    if len(sys.argv) >= 2:
        input_arg = sys.argv[1]
    else:
        input_arg = get_active_project()
        if not input_arg:
            print("Usage: python 08-footage-assembler.py <job_dir>")
            sys.exit(1)
        print(f"📌 Using active project: {input_arg}")
        
    update_step(input_arg, "08", "wip")
    assemble_footage(input_arg)
    update_step(input_arg, "08", "done")
