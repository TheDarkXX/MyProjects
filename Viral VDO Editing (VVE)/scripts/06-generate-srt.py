import json
import sys
from pathlib import Path

# Fix Windows console encoding for emojis
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def format_time(seconds: float) -> str:
    """Format seconds into SRT timestamp (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    msecs = int(round((seconds - int(seconds)) * 1000))
    # Handle rounding edge cases where msecs becomes 1000
    if msecs >= 1000:
        msecs = 0
        secs += 1
        if secs >= 60:
            secs = 0
            minutes += 1
            if minutes >= 60:
                minutes = 0
                hours += 1
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{msecs:03d}"

def json_to_srt(grouped_json_path: str, output_srt_path: str):
    data = json.loads(Path(grouped_json_path).read_text(encoding="utf-8"))
    groups = data.get("groups", [])
    
    if not groups:
        print("No subtitle groups found.")
        return

    with open(output_srt_path, "w", encoding="utf-8") as f:
        for i, group in enumerate(groups, start=1):
            start_str = format_time(group["start"])
            end_str = format_time(group["end"])
            text = group["text"]
            
            f.write(f"{i}\n")
            f.write(f"{start_str} --> {end_str}\n")
            f.write(f"{text}\n\n")

if __name__ == "__main__":
    import os
    import subprocess
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    try:
        from utils.capcut_utils import get_project_path, get_draft_path, force_close_capcut, clear_capcut_cache, load_draft
        from utils.snapshot import save_snapshot, restore_snapshot, save_srt_snapshot
        from utils.subtitle_styler import apply_default_style
        from utils.registry import get_active_project, update_step
    except ImportError:
        print("❌ Error: utils modules not found.")
        sys.exit(1)

    if len(sys.argv) >= 2:
        input_arg = sys.argv[1]
    else:
        input_arg = get_active_project()
        if not input_arg:
            print("Usage: python 06-generate-srt.py <job_dir>")
            sys.exit(1)
        print(f"📌 Using active project: {input_arg}")
        
    update_step(input_arg, "06", "wip")
    
    try:
        project_dir = get_project_path(input_arg)
        draft_path = get_draft_path(input_arg)
        job_dir = Path(project_dir)
    except Exception as e:
        print(f"❌ Error resolving project path: {e}")
        job_dir = Path(input_arg)
        project_dir = str(job_dir)
        draft_path = str(job_dir / "draft_content.json")
    
    json_files = list(job_dir.glob("*.grouped.json"))
    if not json_files:
        print(f"❌ Error: No .grouped.json found in {job_dir}")
        sys.exit(1)
        
    json_path = str(json_files[0])
    
    from utils.registry import get_raw_folder
    raw_folder_str = get_raw_folder(input_arg)
    
    if raw_folder_str:
        out_path = str(Path(raw_folder_str) / (input_arg + "_final.srt"))
    else:
        out_path = str(Path(json_path).with_suffix(""))
        if out_path.endswith(".grouped"):
            out_path = out_path[:-8]
        out_path += ".srt"

    
    # Also save a copy to intermediates
    inter_path = job_dir / "intermediates"
    inter_path.mkdir(exist_ok=True)
    inter_srt_path = inter_path / "subtitles.srt"
    
    json_to_srt(json_path, out_path)
    json_to_srt(json_path, str(inter_srt_path))
    
    # Auto-copy SRT to the source video folder (same name as video)
    video_files = list(job_dir.glob("*.mp4"))
    if video_files:
        video_path = video_files[0]
        source_srt_path = video_path.with_suffix(".srt")
        import shutil
        shutil.copy2(out_path, source_srt_path)
        print(f"Success! SRT saved to {out_path}, {inter_srt_path}, and beside source video {source_srt_path}")
    else:
        print(f"Success! SRT saved to {out_path} and {inter_srt_path}")
        
    print("\n--- Injecting Final Subtitles into CapCut ---")
    force_close_capcut()
    
    # Revert to 04b to clear old subtitles and timeline state
    if not restore_snapshot(project_dir, draft_path, "04b"):
        print("❌ Failed to revert to 04b before injecting subtitles. Make sure 04b has been run.")
        sys.exit(1)
        
    # Inject SRT
    cmd = [
        "npx.cmd", "capcut-cli", "import-srt", 
        project_dir, str(inter_srt_path), 
        "--force-write"
    ]
    print(f"Running: {' '.join(cmd)}")
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    
    if res.returncode != 0:
        print(f"❌ Failed to inject SRT: {res.stderr}")
        sys.exit(1)
        
    print(f"✅ Injected SRT successfully: {res.stdout.strip()}")
    
    # 5. Apply default subtitle style (Kanit, Pop Up, etc.)
    print("\n--- Applying Default Subtitle Styles ---")
    draft_data = load_draft(project_dir)
    if apply_default_style(draft_data):
        import json
        with open(os.path.join(project_dir, "draft_content.json"), "w", encoding="utf-8") as f:
            json.dump(draft_data, f, ensure_ascii=False)
        print("✅ Applied 'Kanit + Pop Up' auto-style to subtitles successfully.")
    
    # CRITICAL: capcut-cli only updates the root draft_content.json.
    # In newer CapCut versions, we MUST copy it to Timelines/.../draft_content.json!
    root_draft = os.path.join(project_dir, "draft_content.json")
    import glob
    import shutil
    drafts = glob.glob(os.path.join(project_dir, "**", "draft_content.json"), recursive=True)
    for d in drafts:
        if d != root_draft:
            shutil.copy2(root_draft, d)
            print(f"   Synced injected draft to: {d}")
    
    # CRITICAL: Clear CapCut .tmp caches so it reads the new draft_content.json!
    clear_capcut_cache(project_dir)
    
    # Save snapshot
    save_snapshot(project_dir, draft_path, "06")
    
    # Save SRT versioned snapshot
    save_srt_snapshot(project_dir, str(inter_srt_path))

    # Final Text Verification
    print("\n" + "="*70)
    print("✅ FINAL SRT VERIFICATION (from generated subtitles)")
    print("="*70)
    
    with open(inter_srt_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    text_content = []
    blocks = content.strip().split("\n\n")
    for block in blocks:
        lines = block.split("\n")
        if len(lines) >= 3:
            text_content.append(" ".join(lines[2:]))
            
    final_text = " ".join(text_content)
    print(f"\n{final_text}\n")
    print("="*70)
    print(f"Total cues: {len(blocks)} | Please read the text above carefully to ensure no stutters remain.")
    print("="*70 + "\n")

    update_step(input_arg, '06', 'done')
