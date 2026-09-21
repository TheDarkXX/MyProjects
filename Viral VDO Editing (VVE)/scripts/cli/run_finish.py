import os
import sys
import subprocess

import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="VVE Finish Pipeline (Steps 08-12)")
    parser.add_argument("project_name", help="CapCut project name or path")
    parser.add_argument("--generate-broll", action="store_true", help="Automatically generate B-Roll via FlowKit (07d) before Step 08")
    args = parser.parse_args()

    project_name = args.project_name
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Check B-Roll readiness
    scripts = []
    if args.generate_broll:
        scripts.append("07d-auto-broll-flow.py")
    else:
        # Check if project has pending B-Roll
        try:
            sys.path.append(os.path.join(base_dir, "utils"))
            from capcut_utils import get_project_path
            p_dir = Path(get_project_path(project_name))
            scene_table = p_dir / "scene_table.json"
            manifest = p_dir / "intermediates" / "broll_qa_manifest.json"
            if scene_table.exists():
                import json
                with open(scene_table, "r", encoding="utf-8") as sf:
                    scenes = json.load(sf)
                broll_scenes = [s for s in scenes if "B-Roll" in s.get("visual_type", "")]
                if broll_scenes and not manifest.exists():
                    print("\n" + "=" * 60)
                    print(f"⚠️  NOTICE: {len(broll_scenes)} B-Roll scenes found, but no QA manifest exists.")
                    print("💡 Pass --generate-broll to auto-generate footage via FlowKit,")
                    print("   or run: python scripts/07d-auto-broll-flow.py " + project_name)
                    print("=" * 60 + "\n")
        except Exception:
            pass

    scripts.extend([
        "08-footage-assembler.py",
        "09-sfx-placer.py",
        "10-capcut-inject.py",
        "10b-capcut-auto-style.py",
        "10c-aroll-zoom.py",
        "11-qa-recheck.py",
        "12-viral-score.py"
    ])

    for script in scripts:
        script_path = os.path.join(base_dir, script)
        if not os.path.exists(script_path):
            print(f"Warning: {script} not found. Skipping.")
            continue

        print(f"\n============================================================")
        print(f"Running: {script}")
        print(f"============================================================")

        result = subprocess.run([sys.executable, script_path, project_name])

        if result.returncode != 0:
            if result.returncode == 100:
                print(f"\nPipeline paused at {script} for user interaction.")
                sys.exit(100)
            else:
                print(f"\nPipeline failed at {script} with code {result.returncode}.")
                sys.exit(result.returncode)

        print(f"\n{script} completed successfully.")

    print(f"\nAll finishing steps completed for '{project_name}'!")

if __name__ == "__main__":
    main()
