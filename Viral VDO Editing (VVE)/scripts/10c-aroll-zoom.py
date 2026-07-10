"""
10c-aroll-zoom.py — A-Roll Snap Zoom Executor
อ่าน emphasis field จาก scene_table.json (ที่ AI วางแผนไว้ใน 07a/07b)
แล้ว snap zoom A-Roll segments ใน CapCut draft ตาม
- snap_zoom_in: scale 1.15 (ซูมเข้าทันที)
- snap_zoom_out: scale 0.90 (ซูมออกทันที)
- null: scale 1.0 (ไม่ซูม)
"""
import os
import sys
import json
from pathlib import Path

sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def apply_aroll_zoom(job_dir):
    try:
        from utils.capcut_utils import get_draft_path, get_project_path, load_draft, force_close_capcut, clear_capcut_cache
        from utils.snapshot import save_snapshot
    except ImportError:
        print("Error: utils modules not found.")
        sys.exit(1)

    project_dir = get_project_path(job_dir)
    draft_path = get_draft_path(job_dir)
    job_path = Path(project_dir)

    if not draft_path or not os.path.exists(draft_path):
        print(f"Error: draft_content.json not found for {job_dir}")
        return False

    # Close CapCut first
    force_close_capcut()

    draft = load_draft(project_dir)

    # 1. Load scene table (must have emphasis field from 07a/07b)
    scene_table_file = job_path / "scene_table.json"
    if not scene_table_file.exists():
        print(f"Error: scene_table.json not found in {job_path}")
        return False

    with open(scene_table_file, "r", encoding="utf-8") as f:
        scenes = json.load(f)

    # 2. Build emphasis map: time_range → emphasis
    emphasis_ranges = []
    for scene in scenes:
        emphasis = scene.get("emphasis")
        v_type = scene.get("visual_type", "")

        # Only apply zoom to A-Roll scenes
        if "A-Roll" not in v_type:
            continue

        if emphasis in ("snap_zoom_in", "snap_zoom_out"):
            start_us = int(float(scene.get("start", 0)) * 1_000_000)
            end_us = int(float(scene.get("end", 0)) * 1_000_000)
            reason = scene.get("emphasis_reason", "")
            emphasis_ranges.append((start_us, end_us, emphasis, scene.get("id"), reason))
            print(f"  {scene.get('id')}: {emphasis} -- {reason}")

    if not emphasis_ranges:
        print("No emphasis markers found in scene_table.json. Nothing to zoom.")
        print("Hint: Run 07a + 07b first to let AI plan emphasis points.")
        # Still mark as success (nothing to do is not a failure)
        save_snapshot(project_dir, draft_path, "10c")
        return True

    # 3. Apply zoom to Track 0 segments (A-Roll track)
    tracks = draft.get("tracks", [])
    video_tracks = [t for t in tracks if t.get("type") == "video"]

    if not video_tracks:
        print("Error: No video tracks found in draft.")
        return False

    aroll_track = video_tracks[0]
    modified = False
    zoomed_in_count = 0
    zoomed_out_count = 0

    for seg in aroll_track.get("segments", []):
        tr = seg.get("target_timerange", {})
        start_us = tr.get("start", 0)
        dur_us = tr.get("duration", 0)
        mid_us = start_us + (dur_us / 2)

        # Check if mid_us falls inside any emphasis range
        matched_emphasis = None
        for r_start, r_end, emphasis, s_id, reason in emphasis_ranges:
            if r_start <= mid_us <= r_end:
                matched_emphasis = emphasis
                break

        # Ensure clip.scale structure exists
        if "clip" not in seg:
            seg["clip"] = {}
        if "scale" not in seg["clip"]:
            seg["clip"]["scale"] = {"x": 1.0, "y": 1.0}

        scale = seg["clip"]["scale"]

        if matched_emphasis == "snap_zoom_in":
            scale["x"] = 1.15
            scale["y"] = 1.15
            zoomed_in_count += 1
            modified = True
        elif matched_emphasis == "snap_zoom_out":
            scale["x"] = 0.90
            scale["y"] = 0.90
            zoomed_out_count += 1
            modified = True
        else:
            # Reset to normal if not emphasized
            if scale.get("x", 1.0) != 1.0 or scale.get("y", 1.0) != 1.0:
                scale["x"] = 1.0
                scale["y"] = 1.0
                modified = True

    print(f"Applied: {zoomed_in_count} snap_zoom_in, {zoomed_out_count} snap_zoom_out")

    # 4. Save draft
    if modified:
        with open(draft_path, "w", encoding="utf-8") as f:
            json.dump(draft, f, ensure_ascii=False)

        # Sync to all other draft_content.json instances
        import glob
        import shutil
        drafts = glob.glob(os.path.join(project_dir, "**", "draft_content.json"), recursive=True)
        for d in drafts:
            if d != str(draft_path):
                shutil.copy2(draft_path, d)

        # Clear cache
        clear_capcut_cache(project_dir)

        print("A-Roll Snap Zoom applied successfully.")

    save_snapshot(project_dir, draft_path, "10c")
    return True


if __name__ == "__main__":
    from utils.registry import get_active_project, update_step

    input_arg = sys.argv[1] if len(sys.argv) > 1 else None
    if not input_arg:
        input_arg = get_active_project()
        if not input_arg:
            print("Usage: python 10c-aroll-zoom.py <job_dir>")
            sys.exit(1)

    update_step(input_arg, "10c", "wip")

    print("==============================================")
    print("   10c - A-ROLL SNAP ZOOM (AI-DRIVEN)")
    print("==============================================")

    success = apply_aroll_zoom(input_arg)

    if success:
        update_step(input_arg, "10c", "done")
        sys.exit(0)
    else:
        sys.exit(1)
