import os
import sys
import json
import subprocess

def emit_progress(step, status):
    msg = {"type": "progress", "step": step, "status": status}
    print(json.dumps(msg), flush=True)

def emit_result(data):
    print(json.dumps({"type": "result", "data": data}), flush=True)

def emit_error(message):
    print(json.dumps({"type": "error", "message": message}), flush=True)
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        emit_error("No input file provided.")
        
    target_file = sys.argv[1]
    if not os.path.exists(target_file):
        emit_error(f"File not found: {target_file}")
        
    # Optional arguments for margin (e.g., "0.2s,0.4s")
    margin = sys.argv[2] if len(sys.argv) > 2 else "0.2s,0.4s"

    emit_progress("init", "Starting Silence Removal (auto-editor)...")
    
    # We will run auto-editor via subprocess to capture its output
    # Since we installed auto-editor via pip, we can run `python -m auto_editor`
    command = [
        sys.executable, "-m", "auto_editor",
        target_file,
        "--margin", margin,
        "--no-open" # Do not open the default media player
    ]
    
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8'
        )
        
        for line in process.stdout:
            # auto-editor prints progress like "Analyzing audio... 50%"
            # Just pass it to UI
            if line.strip():
                emit_progress("processing", f"Auto-Editor: {line.strip()}")
                
        process.wait()
        
        if process.returncode != 0:
            emit_error(f"Auto-editor exited with code {process.returncode}")
            
        # Default output format of auto-editor is original_filename_ALTERED.ext
        base, ext = os.path.splitext(target_file)
        altered_file = f"{base}_ALTERED{ext}"
        
        if os.path.exists(altered_file):
            emit_progress("done", "Silence removal complete!")
            emit_result({"altered_video": altered_file})
        else:
            emit_error("Altered video file not found.")

    except Exception as e:
        emit_error(f"Failed to run auto-editor: {str(e)}")

if __name__ == "__main__":
    main()
