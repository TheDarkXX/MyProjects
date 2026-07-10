import os
import json
import xml.etree.ElementTree as ET
import copy
import uuid
import shutil
import sys

# Add current dir to path to import from utils/
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from utils.capcut_utils import get_project_path, get_draft_path, load_draft, safe_save_draft
    from utils.registry import get_active_project, update_step
except ImportError:
    print("❌ Error: utils modules not found.")
    sys.exit(1)

def generate_uuid():
    return str(uuid.uuid4()).upper()

def timebolt_xml_to_capcut_json(xml_path, json_path):
    print(f"Reading XML: {xml_path}")
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    # 1. Get sequence rate (timebase)
    rate_elem = root.find('./sequence/rate/timebase')
    if rate_elem is None:
        print("Error: Could not find timebase in XML")
        return
    fps = float(rate_elem.text)
    print(f"Found FPS: {fps}")
    
    # 2. Extract ONLY top-level clipitems from the sequence track
    # Timebolt XML structure:
    #   <sequence> -> <media> -> <video> -> <track> -> <clipitem> (THESE are the actual cuts)
    #     Each clipitem contains a nested <sequence> with its own clipitems (source refs - SKIP these)
    track = root.find('./sequence/media/video/track')
    if track is None:
        print("Error: Could not find video track in XML")
        return
    
    clips = []
    for clipitem in track.findall('clipitem'):  # Direct children only, not recursive
        start_elem = clipitem.find('start')
        end_elem = clipitem.find('end')
        in_elem = clipitem.find('in')
        out_elem = clipitem.find('out')
        
        if any(e is None for e in [start_elem, end_elem, in_elem, out_elem]):
            continue
            
        start_frame = int(start_elem.text)
        end_frame = int(end_elem.text)
        in_frame = int(in_elem.text)
        out_frame = int(out_elem.text)
        
        # Skip invalid entries
        if end_frame <= start_frame or out_frame <= in_frame:
            continue
        
        # Convert frames to microseconds (CapCut uses microseconds)
        source_start_us = int((in_frame / fps) * 1000000)
        source_dur_us = int(((out_frame - in_frame) / fps) * 1000000)
        
        clips.append({
            'in_frame': in_frame,
            'out_frame': out_frame,
            'start_frame': start_frame,
            'end_frame': end_frame,
            'source_start_us': source_start_us,
            'source_dur_us': source_dur_us,
        })
        
    print(f"Extracted {len(clips)} cuts from Timebolt XML (top-level only).")
    
    if len(clips) == 0:
        print("No clips found!")
        return
    
    # Show first 5 cuts for verification
    for i, c in enumerate(clips[:5]):
        print(f"  Cut {i+1}: frames {c['in_frame']}-{c['out_frame']} "
              f"({c['source_dur_us']/1000000:.2f}s)")
    if len(clips) > 5:
        print(f"  ... and {len(clips)-5} more cuts")

    # 3. Read CapCut JSON (use backup if available)
    bak_path = json_path + ".tb_bak"
    read_path = bak_path if os.path.exists(bak_path) else json_path
    print(f"Reading JSON: {read_path}")
    with open(read_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    # Find main video track
    video_track = None
    for track_obj in data.get('tracks', []):
        if track_obj.get('type') == 'video':
            video_track = track_obj
            break
            
    if not video_track:
        print("Error: No video track found in CapCut JSON")
        return
        
    if len(video_track['segments']) == 0:
        print("Error: No segments in video track")
        return
         
    base_segment = video_track['segments'][0]
    
    # 4. Generate new segments based on cuts
    new_segments = []
    accumulated_target = 0
    
    for clip in clips:
        new_seg = copy.deepcopy(base_segment)
        new_seg['id'] = generate_uuid()
        new_seg['source_timerange'] = {
            'start': clip['source_start_us'],
            'duration': clip['source_dur_us']
        }
        new_seg['target_timerange'] = {
            'start': accumulated_target,
            'duration': clip['source_dur_us']
        }
        accumulated_target += clip['source_dur_us']
        new_segments.append(new_seg)
        
    # 5. Update JSON data
    video_track['segments'] = new_segments
    data['duration'] = accumulated_target
    
    total_sec = accumulated_target / 1000000
    print(f"\nTimeline: {len(new_segments)} segments, total {total_sec:.1f}s ({total_sec/60:.1f}min)")
    
    # 6. Save via gateway (Force Close CapCut + Backup + Save)
    safe_save_draft(json_path, data, step_name="01a")
        
    print(f"\n✅ SUCCESS! CapCut project updated with {len(new_segments)} Timebolt cuts.")

if __name__ == "__main__":
    import os
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
    try:
        from registry import update_step
        from project_setup import handle_init_args
    except ImportError:
        pass

    if len(sys.argv) < 2:
        print("Usage: python 01a-timebolt-cut.py <timebolt_xml_file> [raw_folder] [capcut_project_name]")
        sys.exit(1)
        
    xml_file = sys.argv[1]
    
    # We shift sys.argv down by 1 so handle_init_args thinks [1] is raw and [2] is capcut
    fake_argv = [sys.argv[0]] + sys.argv[2:]
    project_name = handle_init_args(fake_argv)
        
    try:
        from capcut_utils import get_draft_path
        json_file = get_draft_path(project_name)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
    
    # Auto-register and update step to 01a (WIP)
    update_step(project_name, "01a", "wip")
    
    timebolt_xml_to_capcut_json(xml_file, json_file)
    
    # Update step to 01a (Done for this step, though overall it's WIP)
    update_step(project_name, "01a", "wip")
