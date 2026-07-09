import os
import sys
import subprocess
from pathlib import Path

# Add utils to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
try:
    from registry import get_active_project, update_step
except ImportError:
    print("❌ Error: Could not import utils modules.")
    sys.exit(1)

def run_script(script_name, job_dir):
    print(f"\n{'='*60}")
    print(f"🚀 Running: {script_name}")
    print(f"{'='*60}\n")
    
    script_path = Path(__file__).parent / script_name
    
    cmd = [sys.executable, str(script_path), job_dir]
    
    result = subprocess.run(cmd)
    
    if result.returncode == 100:
        print(f"\n⏸️ Pipeline paused at {script_name} for AI/User interaction.")
        sys.exit(100)
    elif result.returncode != 0:
        print(f"\n❌ Pipeline stopped: Error occurred in {script_name}")
        sys.exit(result.returncode)
    
    print(f"\n✅ {script_name} completed successfully.")

def main():
    if len(sys.argv) >= 2:
        job_dir = sys.argv[1]
    else:
        job_dir = get_active_project()
        if not job_dir:
            print("Usage: python 04Loop-run04b-06.py <job_dir>")
            sys.exit(1)
        print(f"📌 Using active project: {job_dir}")
        
    update_step(job_dir, "04Loop", "wip")
    
    # Try resolving path using capcut_utils
    try:
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from utils.capcut_utils import get_project_path
        project_dir = get_project_path(job_dir)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

    print(f"\n▶️ Starting Editorial Loop for project: {job_dir}")
    
    run_script("04b-apply-editorial-cuts.py", job_dir)
    
    # Run 05a (Generates Prompt). It might not pause, but we need to ensure the AI actually generates ai_segmented_latest.txt
    run_script("05a-subtitle-agent.py", job_dir)
    
    # Run 05b (Aligns AI text). If ai_segmented_latest.txt is missing, it exits with 100
    run_script("05b-align-ai.py", job_dir)
    
    run_script("06-generate-srt.py", job_dir)
    
    print(f"\n🎉 Editorial Loop completed successfully for '{job_dir}'!")
    print("💡 Please open CapCut and check the final subtitles timeline.")

    
    update_step(job_dir, "06", "done")

if __name__ == "__main__":
    main()
