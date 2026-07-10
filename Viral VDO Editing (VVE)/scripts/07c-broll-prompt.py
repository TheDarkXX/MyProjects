"""
07c-broll-prompt.py — B-Roll Prompt Generator
อ่าน scene_table.json (จาก 07b) แล้วสร้าง scene_table.md
ที่มี Prompt สำหรับ AI ไปเจน B-Roll ตามสูตร 8 Categories (A-H)

Output: scene_table.md (สำหรับ God Flow / Text2Video)
"""
import os
import sys
import json
import argparse
from pathlib import Path

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from utils.config_loader import load_channel_config
except ImportError:
    def load_channel_config(): return {}


def generate_broll_prompt(job_dir: Path, output_md_path: str):
    """
    อ่าน scene_table.json (ที่มี visual_type แล้ว) แล้วสร้าง Prompt MD
    สำหรับ AI Art Director ไปเขียน B-Roll prompt
    """
    scene_table_file = job_dir / "scene_table.json"

    if not scene_table_file.exists():
        print(f"Error: scene_table.json not found. Run 07b first.")
        sys.exit(1)

    with open(scene_table_file, 'r', encoding='utf-8') as f:
        scenes = json.load(f)

    # Determine prompt mode from channel config
    config = load_channel_config()
    prompt_mode = config.get("prompt_mode", "video")  # "video" or "image"

    if prompt_mode == "video":
        masterprompt_file = "doctorbank_broll_text2video.yaml"
        columns = "`Scene ID` | `Visual Type` | `Subtitle` | `Scene Story` | `Category` | `Video Prompt`"
        critical_rule = """> **CRITICAL RULE:** For `Video Prompt`, you MUST wrap the Scene ID at the very beginning like this: `[S01] Premium food photography, slow dolly...`
> **CRITICAL RULE 2:** If Visual Type is 'A-Roll (Main Clip)', DO NOT include it in the TSV table at all. Only output rows that are 'B-Roll (AI Generated)' so the user can copy-paste the entire table without A-Roll rows."""
    else:
        masterprompt_file = "doctorbank_broll_image+motion.yaml"
        columns = "`Scene ID` | `Visual Type` | `Subtitle` | `Scene Story` | `Category` | `Image Prompt` | `Motion Prompt`"
        critical_rule = """> **CRITICAL RULE:** For both `Image Prompt` and `Motion Prompt`, you MUST wrap the Scene ID at the very beginning like this: `[S01] Premium food...` or `[S01] Slow pan...`
> **CRITICAL RULE 2:** If Visual Type is 'A-Roll (Main Clip)', DO NOT include it in the TSV table at all. Only output rows that are 'B-Roll (AI Generated)' so the user can copy-paste the entire table without A-Roll rows."""

    # Count B-Roll scenes
    broll_count = sum(1 for s in scenes if "B-Roll" in s.get("visual_type", ""))
    aroll_count = sum(1 for s in scenes if "A-Roll" in s.get("visual_type", ""))

    # Write MD
    with open(output_md_path, 'w', encoding='utf-8') as f:
        f.write("# Scene Table\n\n")
        f.write(f"Please act as the AI Art Director. Read the `{masterprompt_file}` to understand the 8 Categories.\n")
        f.write(f"Then, analyze the following scenes and generate a **TSV Table** containing the following columns:\n")
        f.write(f"{columns}\n\n")
        f.write(f"{critical_rule}\n\n")
        f.write("Do NOT output JSON. Output the raw TSV inside a markdown code block so I can copy-paste to Excel.\n\n")
        f.write("```json\n")
        json.dump(scenes, f, ensure_ascii=False, indent=2)
        f.write("\n```\n")

    print(f"Generated B-Roll prompt at {Path(output_md_path).name}")
    print(f"Total: {len(scenes)} scenes ({aroll_count} A-Roll, {broll_count} B-Roll)")
    print(f"Prompt mode: {prompt_mode}")
    print("Next step: Paste the contents of scene_table.md to AG to get your Master Prompts.")


if __name__ == "__main__":
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
    try:
        from registry import get_active_project, update_step
        from capcut_utils import get_project_path
        from backup import insurance_backup
    except ImportError:
        print("Error: Could not import utils modules.")
        sys.exit(1)

    parser = argparse.ArgumentParser(description="07c: B-Roll Prompt Generator")
    parser.add_argument("job_dir", nargs="?", help="Project name or job directory")
    args = parser.parse_args()

    input_arg = args.job_dir
    if not input_arg:
        input_arg = get_active_project()
        if not input_arg:
            print("Usage: python 07c-broll-prompt.py <job_dir>")
            sys.exit(1)
        print(f"Using active project: {input_arg}")

    update_step(input_arg, "07c", "wip")

    try:
        job_dir = Path(get_project_path(input_arg))
    except Exception as e:
        print(f"Error resolving project path: {e}")
        job_dir = Path(input_arg)

    out_md = str(job_dir / "scene_table.md")

    generate_broll_prompt(job_dir, out_md)
    insurance_backup(input_arg)
    update_step(input_arg, "07c", "done")
