import json
import sys
from pathlib import Path
from utils.capcut_utils import get_project_path, load_draft

def debug(job_dir):
    proj_path = get_project_path(job_dir)
    tp = Path(proj_path) / "transcript.raw.json"
    if not tp.exists():
        tp = Path(proj_path) / "transcript.json"
        
    with open(tp, 'r', encoding='utf-8') as f:
        words = json.load(f).get("words", [])
        
    draft = load_draft(job_dir)
    tracks = draft.get("tracks", [])
    video_segments = []
    for t in tracks:
        if t.get("type") == "video":
            video_segments = t.get("segments", [])
            break
            
    print(f"Total video segments in draft: {len(video_segments)}")
    for i, seg in enumerate(video_segments[:5]):
        t_range = seg.get("target_timerange", {})
        s_range = seg.get("source_timerange", {})
        print(f"Clip {i}: target [{t_range.get('start')/1e6:.2f}, {(t_range.get('start')+t_range.get('duration'))/1e6:.2f}], source [{s_range.get('start')/1e6:.2f}, {(s_range.get('start')+s_range.get('duration'))/1e6:.2f}]")

    print(f"\nTotal words: {len(words)}")
    for i in range(5):
        w = words[i]
        print(f"W{i:03d}: [{w.get('start')}, {w.get('end')}] {w.get('text')}")

if __name__ == '__main__':
    debug(sys.argv[1])
