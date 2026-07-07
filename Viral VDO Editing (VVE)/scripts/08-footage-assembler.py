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
    job_path = Path(job_dir)
    scene_table_path = job_path / "scene_table.json"
    footage_path = job_path / "Footage"
    inter_path = job_path / "intermediates"
    inter_path.mkdir(exist_ok=True)
    
    if not scene_table_path.exists():
        print(f"Error: scene_table.json not found in {job_dir}")
        sys.exit(1)
        
    if not footage_path.exists():
        print(f"Error: Footage directory not found in {job_dir}")
        sys.exit(1)
        
    with open(scene_table_path, 'r', encoding='utf-8') as f:
        scenes = json.load(f)
        
    commands = []
    
    # Load existing commands if any to append
    commands_file = inter_path / "timeline_commands.json"
    if commands_file.exists():
        with open(commands_file, 'r', encoding='utf-8') as f:
            try:
                commands = json.load(f)
            except:
                commands = []
                
    new_cmds_count = 0
    
    for scene in scenes:
        scene_id = scene["id"]
        target_duration = scene["duration"]
        start_timeline = scene["start"]
        
        # Find matching footage (prefix [S01] or S01)
        matched_file = None
        for file in footage_path.glob("*.mp4"):
            if file.name.startswith(f"[{scene_id}]") or file.name.startswith(f"{scene_id}_"):
                matched_file = file
                break
            
        if not matched_file:
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
        cmd = [
            "add-video",
            str(matched_file.absolute()),
            str(capcut_start_timeline),
            str(capcut_duration),
            "--media-start", str(capcut_media_start),
            "--track", "1"
        ]
        commands.append(cmd)
        new_cmds_count += 1
        
    with open(commands_file, 'w', encoding='utf-8') as f:
        json.dump(commands, f, indent=4, ensure_ascii=False)
            
    print(f"\nAssembly complete! {new_cmds_count} clips matched and commands written to timeline_commands.json.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python 08-footage-assembler.py <job_dir>")
        sys.exit(1)
        
    assemble_footage(sys.argv[1])
