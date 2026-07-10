import os
import sys
import subprocess

def main():
    if len(sys.argv) < 2:
        print("Usage: python run_finish.py <project_name>")
        sys.exit(1)
        
    project_name = sys.argv[1]
    
    scripts = [
        "08-footage-assembler.py",
        "09-sfx-placer.py",
        "10-capcut-inject.py",
        "10b-capcut-auto-style.py",
        "10c-aroll-zoom.py",
        "11-qa-recheck.py",
        "12-viral-score.py"
    ]
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
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
