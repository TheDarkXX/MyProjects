"""
capcut_editor.py — CapCut JSON Injector v3 (Template-Clone Approach)

Instead of building materials from scratch, we clone REAL materials
from a working CapCut project (35.7) and only swap the content/ID.
This guarantees 100% schema compatibility.
"""
import os
import json
import uuid
import argparse
import shutil
import glob
import copy

MICROSECONDS = 1_000_000
TEMPLATE_PROJECT = r"C:\Users\Admin\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\35.7 สุดยอดอาหารบำรุงสายตา\draft_content.json"

def generate_id():
    return str(uuid.uuid4()).upper()

def load_templates():
    """Load segment templates AND material templates from a working project."""
    with open(TEMPLATE_PROJECT, 'r', encoding='utf-8') as f:
        draft = json.load(f)

    templates = {
        'text_segment': None,
        'audio_segment': None,
        'video_segment': None,
        'text_material': None,
        'audio_material': None,
        'video_material': None,
        'text_track': None,
        'audio_track': None,
        'video_overlay_track': None,
    }

    # Extract track templates (with all keys like attribute, is_default_name, etc.)
    for track in draft['tracks']:
        if not track.get('segments'):
            continue
        track_copy = copy.deepcopy(track)
        track_copy['segments'] = []  # Clear segments, keep structure
        
        if track['type'] == 'text' and not templates['text_track']:
            templates['text_track'] = track_copy
            templates['text_segment'] = copy.deepcopy(track['segments'][0])
        elif track['type'] == 'audio' and not templates['audio_track']:
            templates['audio_track'] = track_copy
            templates['audio_segment'] = copy.deepcopy(track['segments'][0])
        elif track['type'] == 'video' and track.get('flag') == 2 and not templates['video_overlay_track']:
            templates['video_overlay_track'] = track_copy
            templates['video_segment'] = copy.deepcopy(track['segments'][0])

    # Fallback for video overlay from main track
    if not templates['video_segment']:
        for track in draft['tracks']:
            if track['type'] == 'video' and track.get('flag') == 0 and track.get('segments'):
                templates['video_segment'] = copy.deepcopy(track['segments'][0])
                break

    # Extract material templates
    if draft['materials'].get('texts'):
        templates['text_material'] = copy.deepcopy(draft['materials']['texts'][0])
    if draft['materials'].get('audios'):
        templates['audio_material'] = copy.deepcopy(draft['materials']['audios'][0])
    if draft['materials'].get('videos'):
        templates['video_material'] = copy.deepcopy(draft['materials']['videos'][0])

    return templates


def clone_text_material(template, text_content):
    """Clone a full text material, replacing only id and content text."""
    mat = copy.deepcopy(template)
    mat['id'] = generate_id()
    
    # Parse the existing content to preserve all styling, just change text
    try:
        content_obj = json.loads(mat['content'])
        if isinstance(content_obj, dict):
            content_obj['text'] = text_content
            # Update text range in styles to match new length
            if 'styles' in content_obj:
                for style in content_obj['styles']:
                    if 'range' in style:
                        style['range'] = [0, len(text_content)]
            mat['content'] = json.dumps(content_obj, ensure_ascii=False, separators=(',', ':'))
        elif isinstance(content_obj, list):
            content_obj[0]['text'] = text_content
            mat['content'] = json.dumps(content_obj, ensure_ascii=False, separators=(',', ':'))
    except Exception as e:
        # Fallback: build minimal content
        content_obj = {"text": text_content}
        mat['content'] = json.dumps(content_obj, ensure_ascii=False, separators=(',', ':'))
    
    return mat


def clone_audio_material(template, path, duration_us):
    """Clone a full audio material, replacing path/id/duration."""
    mat = copy.deepcopy(template)
    mat['id'] = generate_id()
    mat['path'] = path
    mat['name'] = os.path.basename(path)
    mat['duration'] = duration_us
    mat['local_material_id'] = str(uuid.uuid4())
    mat['music_id'] = str(uuid.uuid4())
    return mat


def clone_video_material(template, path, duration_us):
    """Clone a full video material, replacing path/id/duration."""
    mat = copy.deepcopy(template)
    mat['id'] = generate_id()
    mat['path'] = path
    mat['material_name'] = os.path.basename(path)
    mat['duration'] = duration_us
    mat['local_material_id'] = str(uuid.uuid4())
    return mat


def modify_single_file(draft_json_path, vad_data, edit_data, templates):
    """Modify a single draft_content.json file."""
    print(f"Modifying: {draft_json_path}")
    
    # Create backup
    backup_path = draft_json_path + ".bak_vve"
    if not os.path.exists(backup_path):
        shutil.copy2(draft_json_path, backup_path)

    with open(draft_json_path, 'r', encoding='utf-8') as f:
        draft = json.load(f)

    # Find main video track
    main_track = next(
        (t for t in draft.get('tracks', []) if t.get('type') == 'video' and t.get('flag') == 0),
        None
    )
    if not main_track or not main_track.get('segments'):
        print(f"  Skipping: No main video track found.")
        return

    original_segment = main_track['segments'][0]

    # --- Step 1: VAD Cuts on main video ---
    new_segments = []
    current_target_time = 0
    source_to_target = []

    for chunk in vad_data.get('segments', []):
        start_us = int(chunk['start'] * MICROSECONDS)
        duration_us = int(chunk['duration'] * MICROSECONDS)

        seg = copy.deepcopy(original_segment)
        seg['id'] = generate_id()
        seg['source_timerange']['start'] = start_us
        seg['source_timerange']['duration'] = duration_us
        seg['target_timerange']['start'] = current_target_time
        seg['target_timerange']['duration'] = duration_us

        source_to_target.append({
            "src_start": start_us,
            "src_end": start_us + duration_us,
            "tgt_start": current_target_time,
        })

        new_segments.append(seg)
        current_target_time += duration_us

    main_track['segments'] = new_segments
    draft['duration'] = current_target_time

    def get_target_time(source_us):
        # If before first segment
        if source_to_target and source_us < source_to_target[0]["src_start"]:
            return source_to_target[0]["tgt_start"]
            
        for i, m in enumerate(source_to_target):
            if m["src_start"] <= source_us <= m["src_end"]:
                return m["tgt_start"] + (source_us - m["src_start"])
            
            # If we fall between this segment and the next, snap to the boundary
            if i < len(source_to_target) - 1:
                next_m = source_to_target[i+1]
                if m["src_end"] < source_us < next_m["src_start"]:
                    # Snap to the exact cut point in target timeline
                    return next_m["tgt_start"]
                    
        # If after last segment
        if source_to_target and source_us > source_to_target[-1]["src_end"]:
            return source_to_target[-1]["tgt_start"] + (source_to_target[-1]["src_end"] - source_to_target[-1]["src_start"])
            
        return source_us

    # --- Step 2: Remove all non-main tracks ---
    draft['tracks'] = [t for t in draft['tracks'] if t.get('type') == 'video' and t.get('flag') == 0]

    # Ensure material arrays exist and are empty of old injected materials
    # (We only want the materials that belong to the main video, but since we are recreating everything,
    # we should clear texts, audios, and b-roll videos, keeping only the main video material if possible.
    # Actually, the main video material is already in draft['materials']['videos']. 
    # Let's just clear texts and audios completely, and leave videos alone, we'll append to videos.)
    draft['materials']['texts'] = []
    draft['materials']['audios'] = []
    
    # For videos, keep only the material referenced by the main video segment
    main_vid_mat_id = original_segment.get('material_id')
    draft['materials']['videos'] = [v for v in draft['materials'].get('videos', []) if v.get('id') == main_vid_mat_id]

    render_index_counter = 15000

    # --- Step 3: Subtitles ---
    if edit_data.get('subtitles') and templates['text_segment'] and templates['text_material']:
        # Clone track structure from template
        text_track = copy.deepcopy(templates['text_track']) if templates['text_track'] else {
            "attribute": 4, "flag": 1, "id": generate_id(),
            "is_default_name": True, "name": "", "type": "text", "segments": []
        }
        text_track['id'] = generate_id()
        text_track['segments'] = []

        for i, sub in enumerate(edit_data['subtitles']):
            # Clone FULL material from template
            mat = clone_text_material(templates['text_material'], sub['text'])
            draft['materials']['texts'].append(mat)

            # Clone FULL segment from template
            seg = copy.deepcopy(templates['text_segment'])
            seg['id'] = generate_id()
            seg['material_id'] = mat['id']
            seg['extra_material_refs'] = [mat['id']]

            sub_start_us = int(sub['start'] * MICROSECONDS)
            sub_end_us = int(sub['end'] * MICROSECONDS)
            
            target_start_us = get_target_time(sub_start_us)
            target_end_us = get_target_time(sub_end_us)
            duration_us = target_end_us - target_start_us
            
            # Prevent overlap with next subtitle
            if i < len(edit_data['subtitles']) - 1:
                next_start_us = int(edit_data['subtitles'][i+1]['start'] * MICROSECONDS)
                next_target_start_us = get_target_time(next_start_us)
                if target_start_us + duration_us >= next_target_start_us:
                    duration_us = next_target_start_us - target_start_us - 10000

            # Ensure minimum duration
            if duration_us <= 0:
                duration_us = 100000 # 100ms fallback

            seg['target_timerange'] = {"start": target_start_us, "duration": duration_us}
            seg['source_timerange'] = None
            seg['render_index'] = render_index_counter
            render_index_counter += 1

            text_track['segments'].append(seg)

        draft['tracks'].append(text_track)
        print(f"  Added {len(text_track['segments'])} subtitles")

    # --- Step 4: SFX ---
    if edit_data.get('sfx') and templates['audio_segment'] and templates['audio_material']:
        audio_track = copy.deepcopy(templates['audio_track']) if templates['audio_track'] else {
            "attribute": 0, "flag": 0, "id": generate_id(),
            "is_default_name": True, "name": "", "type": "audio", "segments": []
        }
        audio_track['id'] = generate_id()
        audio_track['segments'] = []

        for i, sfx in enumerate(edit_data['sfx']):
            mat = clone_audio_material(templates['audio_material'], sfx['path'], 1000000)
            draft['materials']['audios'].append(mat)

            seg = copy.deepcopy(templates['audio_segment'])
            seg['id'] = generate_id()
            seg['material_id'] = mat['id']
            seg['extra_material_refs'] = [mat['id']]

            sfx_start_us = int(sfx['start'] * MICROSECONDS)
            target_start_us = get_target_time(sfx_start_us)
            
            # Simple duration collision avoidance
            duration_us = mat['duration']
            if i < len(edit_data['sfx']) - 1:
                next_start_us = int(edit_data['sfx'][i+1]['start'] * MICROSECONDS)
                next_target_start_us = get_target_time(next_start_us)
                if target_start_us + duration_us >= next_target_start_us:
                    duration_us = next_target_start_us - target_start_us - 10000
                    
            if duration_us <= 0:
                duration_us = 100000

            seg['target_timerange'] = {"start": target_start_us, "duration": duration_us}
            seg['source_timerange'] = {"start": 0, "duration": duration_us}
            seg['render_index'] = render_index_counter
            render_index_counter += 1

            audio_track['segments'].append(seg)

        draft['tracks'].append(audio_track)
        print(f"  Added {len(audio_track['segments'])} SFX")

    # --- Step 5: B-Rolls ---
    if edit_data.get('brolls') and templates['video_segment'] and templates['video_material']:
        broll_track = copy.deepcopy(templates['video_overlay_track']) if templates['video_overlay_track'] else {
            "attribute": 0, "flag": 2, "id": generate_id(),
            "is_default_name": True, "name": "", "type": "video", "segments": []
        }
        broll_track['id'] = generate_id()
        broll_track['segments'] = []

        for broll in edit_data['brolls']:
            dur_us = int(broll['duration'] * MICROSECONDS)
            mat = clone_video_material(templates['video_material'], broll['path'], dur_us)
            draft['materials']['videos'].append(mat)

            seg = copy.deepcopy(templates['video_segment'])
            seg['id'] = generate_id()
            seg['material_id'] = mat['id']
            seg['extra_material_refs'] = [mat['id']]

            broll_start_us = int(broll['start'] * MICROSECONDS)
            target_start_us = get_target_time(broll_start_us)

            seg['target_timerange'] = {"start": target_start_us, "duration": dur_us}
            seg['source_timerange'] = {"start": 0, "duration": dur_us}
            seg['render_index'] = render_index_counter
            render_index_counter += 1

            if seg.get('clip'):
                seg['clip']['transform']['x'] = 0.0
                seg['clip']['transform']['y'] = 0.0

            broll_track['segments'].append(seg)

        draft['tracks'].append(broll_track)
        print(f"  Added {len(broll_track['segments'])} B-Rolls")

    # --- Write output ---
    with open(draft_json_path, 'w', encoding='utf-8') as f:
        json.dump(draft, f, separators=(',', ':'), ensure_ascii=False)

    # Force overwrite .bak
    bak_path = draft_json_path + ".bak"
    if os.path.exists(bak_path):
        os.remove(bak_path)
    shutil.copy2(draft_json_path, bak_path)

    print(f"  Done! (+ .bak overwritten)")


def process_draft(project_path, vad_json_path, editorial_json_path=None):
    """Find and modify all draft_content.json files recursively."""
    with open(vad_json_path, 'r', encoding='utf-8') as f:
        vad_data = json.load(f)

    edit_data = {}
    if editorial_json_path and os.path.exists(editorial_json_path):
        with open(editorial_json_path, 'r', encoding='utf-8') as f:
            edit_data = json.load(f)

    templates = load_templates()
    
    # Report what templates we found
    for key, val in templates.items():
        print(f"  Template [{key}]: {'FOUND' if val else 'MISSING'}")

    # Find all draft_content.json files
    target_files = glob.glob(os.path.join(project_path, "**", "draft_content.json"), recursive=True)
    direct = os.path.join(project_path, "draft_content.json")
    if direct not in target_files and os.path.exists(direct):
        target_files.append(direct)

    if not target_files:
        raise FileNotFoundError(f"No draft_content.json found in {project_path}")

    for f in target_files:
        modify_single_file(f, vad_data, edit_data, templates)

    print(f"\nAll {len(target_files)} files modified successfully!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CapCut JSON Injector v3")
    parser.add_argument("project_path", type=str)
    parser.add_argument("--vad", type=str, default="vad_result.json")
    parser.add_argument("--editorial", type=str, default=None)
    args = parser.parse_args()

    try:
        process_draft(args.project_path, args.vad, args.editorial)
    except Exception as e:
        import traceback
        traceback.print_exc()
