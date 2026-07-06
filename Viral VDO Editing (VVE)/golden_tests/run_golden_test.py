import os
import sys
import shutil
import subprocess
import json
from pathlib import Path

def run_test(test_dir: str):
    test_path = Path(test_dir).resolve()
    if not test_path.exists():
        print(f"Test directory {test_path} not found.")
        sys.exit(1)
        
    input_dir = test_path / "input"
    expected_dir = test_path / "expected"
    
    # Create temp workspace
    temp_job_dir = test_path / "temp_run"
    if temp_job_dir.exists():
        shutil.rmtree(temp_job_dir)
    shutil.copytree(input_dir, temp_job_dir)
    
    # Check if there is a config to override channel
    channel = "doctorbank"
    if (test_path / "config.yaml").exists():
        with open(test_path / "config.yaml", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("channel:"):
                    channel = line.split(":")[1].strip()
                    
    print(f"Running pipeline on {test_path.name}...")
    pipeline_script = Path(__file__).parent.parent / "scripts" / "pipeline.py"
    
    res = subprocess.run([sys.executable, str(pipeline_script), str(temp_job_dir), "--channel", channel])
    if res.returncode != 0:
        print("Pipeline failed during golden test.")
        sys.exit(res.returncode)
        
    print("\nComparing outputs...")
    passed = True
    
    # Compare SRT
    expected_srt = expected_dir / "subtitles.srt"
    actual_srt = temp_job_dir / "intermediates" / "subtitles.srt"
    if expected_srt.exists():
        if not actual_srt.exists():
            print("❌ FAIL: subtitles.srt missing in output.")
            passed = False
        else:
            e_srt = expected_srt.read_text(encoding="utf-8")
            a_srt = actual_srt.read_text(encoding="utf-8")
            if e_srt.strip() == a_srt.strip():
                print("✅ PASS: subtitles.srt matches perfectly.")
            else:
                print("❌ FAIL: subtitles.srt differs from expected.")
                passed = False
                
    # Compare Editorial Decisions
    expected_ed = expected_dir / "editorial_decisions.json"
    actual_ed = temp_job_dir / "intermediates" / "editorial_decisions.json"
    if expected_ed.exists():
        if not actual_ed.exists():
            print("❌ FAIL: editorial_decisions.json missing in output.")
            passed = False
        else:
            e_json = json.loads(expected_ed.read_text(encoding="utf-8"))
            a_json = json.loads(actual_ed.read_text(encoding="utf-8"))
            if e_json == a_json:
                print("✅ PASS: editorial_decisions.json matches perfectly.")
            else:
                print("❌ FAIL: editorial_decisions.json differs from expected.")
                passed = False
                
    if passed:
        print(f"\n🎉 GOLDEN TEST {test_path.name} PASSED!")
    else:
        print(f"\n💥 GOLDEN TEST {test_path.name} FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_golden_test.py <test_directory>")
        sys.exit(1)
    run_test(sys.argv[1])
