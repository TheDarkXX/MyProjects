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
        cmd = [
            "ffmpeg", "-y", "-i", video_path, 
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

def assemble_footage(scene_table_path: str, footage_dir: str, capcut_project: str):
    """
    Matches scenes with footage, trims using Smart Center Crop (Sharpness Analysis),
    and generates CapCut injection script.
    """
    with open(scene_table_path, 'r', encoding='utf-8') as f:
        scenes = json.load(f)
        
    footage_path = Path(footage_dir)
    if not footage_path.exists():
        print(f"Error: Footage directory {footage_dir} not found.")
        sys.exit(1)
        
    commands = []
    
    for scene in scenes:
        scene_id = scene["id"]
        target_duration = scene["duration"]
        start_timeline = scene["start"]
        
        # Find matching footage (prefix S01_, S02_, etc.)
        matched_file = None
        for file in footage_path.glob(f"{scene_id}_*.mp4"):
            matched_file = file
            break
            
        if not matched_file:
            print(f"Warning: No footage found for {scene_id}. Skipping.")
            continue
            
        print(f"Analyzing {matched_file.name} for {target_duration}s window...")
        
        # Find best trim window
        best_start = find_best_window(str(matched_file), target_duration)
        print(f"  -> Best window starts at {best_start}s")
        
        # Microseconds conversion for capcut-cli
        capcut_start_timeline = int(start_timeline * 1_000_000)
        capcut_duration = int(target_duration * 1_000_000)
        capcut_media_start = int(best_start * 1_000_000)
        
        # Command to add video to track 1 (overlay track)
        cmd = f'capcut-cli add-video --project "{capcut_project}" --file "{matched_file.absolute()}" --start {capcut_start_timeline} --duration {capcut_duration} --media-start {capcut_media_start} --track 1'
        commands.append(cmd)
        
    # Output execution script
    out_script = Path("inject_footage.bat")
    with open(out_script, "w", encoding="utf-8") as f:
        f.write("@echo off\n")
        for cmd in commands:
            f.write(cmd + "\n")
            
    print(f"\nAssembly complete! {len(commands)} clips matched.")
    print(f"Run {out_script.name} to inject into CapCut.")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python footage_assembler.py <scene_table.json> <footage_dir> <capcut_project_path>")
        sys.exit(1)
        
    assemble_footage(sys.argv[1], sys.argv[2], sys.argv[3])
