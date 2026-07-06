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

def style_capcut_project(project_path, job_dir=None):
    import random
    import sys
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir not in sys.path:
        sys.path.append(script_dir)
        
    try:
        from config_loader import load_channel_config, get_style
        config = load_channel_config()
    except ImportError:
        config = {}
        def get_style(c, s, k, d): return d
        
    header_text_raw = ""
    if job_dir:
        header_file = os.path.join(job_dir, "header.txt")
        if os.path.exists(header_file):
            with open(header_file, "r", encoding="utf-8") as f:
                header_text_raw = f.read().strip()
    if not header_text_raw:
        header_text_raw = config.get("default_header_text", "คลิปความรู้สุขภาพ")
        
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
    minnie_transitions_map = {
        "Zoom Shake": {"resource_id": "7290397683808735746", "name": "Zoom Shake", "duration": 666666},
        "Zoom Shake 2": {"resource_id": "7340177833508999681", "name": "Zoom Shake 2", "duration": 1000000},
        "Rotate & Change": {"resource_id": "7327547930728993282", "name": "Rotate & Change", "duration": 600000},
        "Get Closer": {"resource_id": "7551232373363379509", "name": "Get Closer", "duration": 1066666},
        "Zoom Swipe": {"resource_id": "7488157742956350737", "name": "Zoom Swipe", "duration": 1000000},
        "Pull Out": {"resource_id": "6724226338418332167", "name": "Pull Out", "duration": 466666}
    }
    
    trans_names = config.get("transition_pool", list(minnie_transitions_map.keys()))
    minnie_transitions = [minnie_transitions_map.get(n) for n in trans_names if minnie_transitions_map.get(n)]
    if not minnie_transitions:
        minnie_transitions = list(minnie_transitions_map.values())
        
    for trans in draft.get('materials', {}).get('transitions', []):
        t_choice = random.choice(minnie_transitions)
        trans['resource_id'] = t_choice['resource_id']
        trans['name'] = t_choice['name']
        trans['duration'] = t_choice['duration']

    for vid in draft.get('materials', {}).get('videos', []):
        vid['beauty_face_auto_preset'] = {"preset_id": "7134260905470001153", "rate_map": "{\"1\":0.3,\"2\":0.3}"}

    # 3. Adjust Text Styles & Add Highlight Keywords
    print("Styling Subtitles & Applying Highlights...")
    
    # Load Highlight Config
    hl_enabled = get_style(config, "highlight", "enabled", True)
    hl_color = get_style(config, "highlight", "color", "#FFE600")
    hl_stroke_color = get_style(config, "highlight", "stroke_color", "#000000")
    hl_stroke_width = get_style(config, "highlight", "stroke_width", 0.12)
    hl_size_mult = get_style(config, "highlight", "size_multiplier", 1.2)
    hl_keywords = get_style(config, "highlight", "keywords", ["อักเสบ", "กระดูก", "แคลเซียม", "วิตามิน"])
    
    def hex_to_rgb(hex_str):
        hex_str = hex_str.lstrip('#')
        if len(hex_str) == 6:
            return [int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4)]
        return [1.0, 1.0, 1.0]
        
    hl_rgb = hex_to_rgb(hl_color)
    hl_stroke_rgb = hex_to_rgb(hl_stroke_color)
    
    for text_mat in draft.get('materials', {}).get('texts', []):
        try:
            content_dict = json.loads(text_mat['content'])
            raw_text = content_dict.get('text', '')
            
            is_header = False
            if header_text_raw and (header_text_raw in raw_text or raw_text in header_text_raw):
                is_header = True
            
            if is_header:
                text_mat['font_size'] = get_style(config, "header", "font_size", 18.0)
                text_mat['border_width'] = get_style(config, "header", "stroke_width", 0.1)
                text_mat['shadow_alpha'] = get_style(config, "header", "shadow_alpha", 0.9)
                text_mat['shadow_distance'] = 8.0
            else:
                text_mat['font_size'] = get_style(config, "subtitle", "font_size", 14.0)
                text_mat['border_width'] = get_style(config, "subtitle", "stroke_width", 0.08)
                text_mat['shadow_alpha'] = get_style(config, "subtitle", "shadow_alpha", 0.8)
                text_mat['shadow_distance'] = get_style(config, "subtitle", "shadow_distance", 6.0)
            
            if 'styles' in content_dict and len(content_dict['styles']) > 0:
                base_style = content_dict['styles'][0]
                
                # Base Styles
                if is_header:
                    header_color = hex_to_rgb(get_style(config, "header", "color", "#FFE600"))
                    base_style['fill'] = {"content": {"solid": {"color": header_color}}}
                
                stroke_w = get_style(config, "header", "stroke_width", 0.1) if is_header else get_style(config, "subtitle", "stroke_width", 0.08)
                stroke_c = hex_to_rgb(get_style(config, "header", "stroke_color", "#000000") if is_header else get_style(config, "subtitle", "stroke_color", "#000000"))
                base_style['strokes'] = [{"alpha": 1.0, "width": stroke_w, "content": {"render_type": "solid", "solid": {"alpha": 1.0, "color": stroke_c}}}]
                
                # Highlighting for Subtitles (Not Headers)
                if not is_header and hl_enabled:
                    # Clear any existing extra styles, keep only the base style
                    content_dict['styles'] = [base_style]
                    
                    utf16_bytes = raw_text.encode('utf-16-le')
                    
                    for kw in hl_keywords:
                        if kw in raw_text:
                            # Calculate UTF-16 byte offsets
                            start_idx = 0
                            while True:
                                idx = raw_text.find(kw, start_idx)
                                if idx == -1: break
                                
                                # Convert char index to byte offset
                                pre_text = raw_text[:idx]
                                match_text = raw_text[idx:idx+len(kw)]
                                
                                start_byte = len(pre_text.encode('utf-16-le'))
                                end_byte = start_byte + len(match_text.encode('utf-16-le'))
                                
                                # Create a copy of base style for the highlighted word
                                hl_style = json.loads(json.dumps(base_style))
                                hl_style['range'] = [start_byte // 2, end_byte // 2] # CapCut uses 16-bit word offsets
                                hl_style['fill'] = {"content": {"solid": {"color": hl_rgb}}}
                                hl_style['strokes'] = [{"alpha": 1.0, "width": hl_stroke_width, "content": {"render_type": "solid", "solid": {"alpha": 1.0, "color": hl_stroke_rgb}}}]
                                hl_style['size'] = hl_size_mult
                                
                                content_dict['styles'].append(hl_style)
                                start_idx = idx + len(kw)
                                
            text_mat['content'] = json.dumps(content_dict, ensure_ascii=False)
        except Exception as e:
            print(f"Error parsing text content: {e}")

    with open(project_path, 'w', encoding='utf-8') as f:
        json.dump(draft, f, ensure_ascii=False, separators=(',', ':'))
    print("SUCCESS: CapCut project successfully styled!")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        job_dir = sys.argv[2] if len(sys.argv) > 2 else None
        style_capcut_project(sys.argv[1], job_dir)
    else:
        print("Usage: python 08b-capcut-auto-style.py <draft_content.json> [job_dir]")
