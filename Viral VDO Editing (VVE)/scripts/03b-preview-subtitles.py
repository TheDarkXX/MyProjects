import os
import sys
import subprocess
from pathlib import Path
import json

def get_draft_path(job_dir):
    p = Path(job_dir)
    return p / "draft_content.json"

def run_capcut_cli(args):
    cmd = ["npx.cmd", "capcut-cli"] + args
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    if result.returncode != 0:
        print(f"CLI Error: {result.stderr}")
        return False, result.stderr
    print(f"Success: {result.stdout.strip()}")
    return True, result.stdout

def main(job_name):
    # Add utils to path
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
    try:
        from capcut_utils import get_project_path, force_close_capcut, load_draft, apply_default_style
        from registry import get_active_project, update_step
    except ImportError:
        print("❌ Error: Could not import utils modules.")
        sys.exit(1)    
        
    job_dir = Path(get_project_path(job_name))
    
    if not job_dir.exists():
        print(f"Error: Project '{job_name}' not found at {job_dir}")
        sys.exit(1)

    print("\n==============================================")
    print("   03b - PREVIEW SUBTITLES GENERATOR")
    print("==============================================\n")
    
    # 1. Run 05-word-segment
    print("--- 1. Grouping Raw Transcript ---")
    script_05 = Path(__file__).parent / "05-word-segment.py"
    res = subprocess.run([sys.executable, str(script_05), job_name])
    if res.returncode != 0:
        print("Failed to run 05-word-segment.py")
        sys.exit(1)

    # 2. Generate Raw SRT
    print("\n--- 2. Generating Raw SRT ---")
    script_06_dir = str(Path(__file__).parent)
    if script_06_dir not in sys.path:
        sys.path.append(script_06_dir)
    try:
        from importlib.machinery import SourceFileLoader
        gen_srt_mod = SourceFileLoader("gen_srt", str(Path(__file__).parent / "06-generate-srt.py")).load_module()
    except Exception as e:
        print(f"Failed to load 06-generate-srt.py: {e}")
        sys.exit(1)
        
    json_path = job_dir / "transcript.grouped.json"
    if not json_path.exists():
        print(f"Error: {json_path} not found")
        sys.exit(1)
        
    from registry import get_raw_folder
    raw_folder_str = get_raw_folder(job_name)
    if raw_folder_str:
        srt_file = Path(raw_folder_str) / (job_name + "_preview.srt")
    else:
        srt_file = job_dir / "intermediates" / "subtitles_raw.srt"

    srt_file.parent.mkdir(exist_ok=True)
    gen_srt_mod.json_to_srt(str(json_path), str(srt_file))

    # 3. Inject SRT into CapCut
    print("\n--- 3. Injecting Preview Subtitles into CapCut ---")
    if not srt_file.exists():
        srt_file = job_dir / "transcript.srt"
        
    if srt_file.exists():
        success, _ = run_capcut_cli(["import-srt", str(job_dir), str(srt_file), "--force-write"])
        if not success:
            sys.exit(1)
            
        print("✅ Injected preview SRT successfully.")
        
        # Apply default subtitle style (Kanit, Pop Up, etc.)
        print("\n--- Applying Default Subtitle Styles ---")
        draft_data = load_draft(str(job_dir))
        if apply_default_style(draft_data):
            with open(get_draft_path(job_dir), "w", encoding="utf-8") as f:
                json.dump(draft_data, f, ensure_ascii=False)
            print("✅ Applied 'Kanit + Pop Up' auto-style to preview subtitles successfully.")
    else:
        print("Error: Could not find generated SRT file.")
        sys.exit(1)
        
    # 4. Save snapshot
    snapshot_dir = job_dir / ".snapshots"
    snapshot_dir.mkdir(exist_ok=True)
    
    import shutil
    draft_path = get_draft_path(job_dir)
    snapshot_path = snapshot_dir / "step_03b.json"
    shutil.copy2(draft_path, snapshot_path)
    
    # Use standard ascii to avoid UnicodeEncodeError on Windows cp874
    print("\n[SUCCESS] Successfully injected PREVIEW SUBTITLES!")
    print(f"   Snapshot saved to {snapshot_path}")
    print("\n[NEXT STEPS]")
    print("   1. Open CapCut and play the timeline to verify the transcription.")
    print("   2. When ready, run 04-editorial-agent.py to let AI make cuts.")

if __name__ == "__main__":
    if len(sys.argv) >= 2:
        project_name = sys.argv[1]
    else:
        sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
        from registry import get_active_project, update_step
        project_name = get_active_project()
        if not project_name:
            print("Usage: python 03b-preview-subtitles.py <capcut_project_name>")
            sys.exit(1)
        print(f"📌 Using active project: {project_name}")
        
    update_step(project_name, "03b", "wip")
    main(project_name)
    update_step(project_name, "03b", "done")
