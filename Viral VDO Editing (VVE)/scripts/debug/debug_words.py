import json
import sys
from pathlib import Path
from utils.capcut_utils import get_project_path, load_draft

def debug_words(job_dir):
    proj_path = get_project_path(job_dir)
    tp = Path(proj_path) / "transcript.raw.json"
    if not tp.exists(): tp = Path(proj_path) / "transcript.json"
    
    with open(tp, 'r', encoding='utf-8') as f:
        words = json.load(f).get("words", [])
        
    draft = load_draft(job_dir)
    segs = []
    for t in draft.get("tracks", []):
        if t.get("type") == "video":
            segs = t.get("segments", [])
            break
            
    print(f"Total kept segments: {len(segs)}")
    
    # We want to know which words from transcript are kept.
    # The transcript is based on the 01b target timeline.
    # In 04b, we sliced the 01b target timeline.
    # BUT wait! When we slice in 04b, what is stored in the segment?
    # new_clip["source_timerange"] is modified by adding `trim_front_us` (which is in target time!).
    # So new_clip["source_timerange"] is just shifted from ORIGINAL source time.
    # What about new_clip["target_timerange"]? It's just a sequential counter (timeline_cursor_us).
    
    # To map back to 01b target time:
    # We know the ORIGINAL 01b clips!
    # Let's load the 01b snapshot and get the original clips.
    # Actually, we can just use `04b`'s logic to print what it keeps.
    pass

if __name__ == '__main__':
    debug_words(sys.argv[1])
