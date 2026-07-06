import json
import os
import shutil
import sys
def is_overlap(range1, range2):
    s1, d1 = range1.get('start', 0), range1.get('duration', 0)
    e1 = s1 + d1
    s2, d2 = range2.get('start', 0), range2.get('duration', 0)
    e2 = s2 + d2
    return max(s1, s2) < min(e1, e2)

def style_capcut_project(project_path):
    import random
    
    # 0. Force Close CapCut to release file lock
    print("Closing CapCut to prevent file locking...")
    try:
        import subprocess
        subprocess.run(["powershell", "-Command", "Stop-Process -Name CapCut -Force -ErrorAction SilentlyContinue"], capture_output=True)
        import time
        time.sleep(1) # wait for process to terminate
    except Exception as e:
        pass
        
    backup_path = project_path + '.backup'
    shutil.copy2(project_path, backup_path)
    print(f"Backup created at {backup_path}")
    
    with open(project_path, 'r', encoding='utf-8') as f:
        draft = json.load(f)

    # 1. Adjust Layout (Force Full Screen B-Rolls)
    print("Adjusting Layout (Force Full Screen)...")
    tracks = draft.get('tracks', [])
    video_tracks = [t for t in tracks if t.get('type') == 'video']
    if video_tracks:
        main_track = max(video_tracks, key=lambda t: len(t.get('segments', [])))
        broll_tracks = [t for t in video_tracks if t != main_track]
        
        for bt in broll_tracks:
            for seg in bt.get('segments', []):
                if 'clip' in seg and 'transform' in seg['clip']:
                    seg['clip']['transform']['y'] = 0.0    # Full screen B-Roll
                    seg['clip']['scale']['x'] = 1.0
                    seg['clip']['scale']['y'] = 1.0
        
        for seg in main_track.get('segments', []):
            if 'clip' in seg and 'transform' in seg['clip']:
                seg['clip']['transform']['y'] = 0.0
                seg['clip']['scale']['x'] = 1.0
                seg['clip']['scale']['y'] = 1.0

    # 2. Add Minnie Transitions & Beauty Face
    print("Injecting Minnie Transitions & Beauty Face...")
    minnie_transitions = [
        {"resource_id": "7290397683808735746", "name": "Zoom Shake", "duration": 666666},
        {"resource_id": "7340177833508999681", "name": "Zoom Shake 2", "duration": 1000000},
        {"resource_id": "7327547930728993282", "name": "Rotate & Change", "duration": 600000},
        {"resource_id": "7551232373363379509", "name": "Get Closer", "duration": 1066666},
        {"resource_id": "7488157742956350737", "name": "Zoom Swipe", "duration": 1000000},
        {"resource_id": "6724226338418332167", "name": "Pull Out", "duration": 466666}
    ]
    for trans in draft.get('materials', {}).get('transitions', []):
        t_choice = random.choice(minnie_transitions)
        trans['resource_id'] = t_choice['resource_id']
        trans['name'] = t_choice['name']
        trans['duration'] = t_choice['duration']

    for vid in draft.get('materials', {}).get('videos', []):
        vid['beauty_face_auto_preset'] = {"preset_id": "7134260905470001153", "rate_map": "{\"1\":0.3,\"2\":0.3}"}
        if 'video_algorithm' not in vid:
            vid['video_algorithm'] = {}
        vid['video_algorithm']['noise_reduction'] = {"enable": True, "level": 1}

    # 3. Adjust Text Styles & Add Highlight Keywords
    print("Styling Subtitles...")
    for text_mat in draft.get('materials', {}).get('texts', []):
        try:
            content_dict = json.loads(text_mat['content'])
            raw_text = content_dict.get('text', '')
            is_header = "บำรุงไต" in raw_text or "93.7" in raw_text
            
            if is_header:
                text_mat['font_size'] = 18.0
                text_mat['border_width'] = 0.1
                text_mat['shadow_alpha'] = 0.9
                text_mat['shadow_distance'] = 8.0
            else:
                text_mat['font_size'] = 14.0
                text_mat['border_width'] = 0.08
                text_mat['shadow_alpha'] = 0.8
                text_mat['shadow_distance'] = 6.0
            
            if 'styles' in content_dict and len(content_dict['styles']) > 0:
                base_style = content_dict['styles'][0]
                if is_header:
                    base_style['fill'] = {"content": {"solid": {"color": [0.941, 1.0, 0.0]}}} # F0FF00 Yellow
                
                stroke_width = 0.1 if is_header else 0.08
                base_style['strokes'] = [{"alpha": 1.0, "width": stroke_width, "content": {"render_type": "solid", "solid": {"alpha": 1.0, "color": [0.0, 0.0, 0.0]}}}]
                base_style['shadows'] = [{"alpha": 0.9 if is_header else 0.8, "angle": -45.0, "distance": 8.0 if is_header else 6.0, "diffuse": 0.0, "content": {"render_type": "solid", "solid": {"alpha": 1.0, "color": [0.0, 0.0, 0.0]}}}]
                
            text_mat['content'] = json.dumps(content_dict, ensure_ascii=False)
        except Exception as e:
            print(f"Error parsing text content: {e}")

    with open(project_path, 'w', encoding='utf-8') as f:
        json.dump(draft, f, ensure_ascii=False, separators=(',', ':'))
    print("SUCCESS: CapCut project successfully styled!")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        style_capcut_project(sys.argv[1])
    else:
        print("Usage: python 08b-capcut-auto-style.py <draft_content.json>")
