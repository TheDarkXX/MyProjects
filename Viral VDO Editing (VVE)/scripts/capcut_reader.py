import os
import json
import argparse
import sys

def get_capcut_project_path(project_name: str) -> str:
    # On Windows, CapCut drafts are typically here:
    appdata_local = os.environ.get('LOCALAPPDATA', r'C:\Users\Admin\AppData\Local')
    drafts_dir = os.path.join(appdata_local, 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft')
    
    project_path = os.path.join(drafts_dir, project_name)
    if not os.path.exists(project_path):
        raise FileNotFoundError(f"Project '{project_name}' not found at {project_path}")
    
    return project_path

def extract_main_video(project_path: str):
    draft_json_path = os.path.join(project_path, 'draft_content.json')
    if not os.path.exists(draft_json_path):
        raise FileNotFoundError(f"draft_content.json not found in {project_path}")
        
    with open(draft_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    # Find the main video track
    tracks = data.get('tracks', [])
    main_video_track = None
    for track in tracks:
        # flag 0 typically means the main track in CapCut
        if track.get('type') == 'video' and track.get('flag') == 0:
            main_video_track = track
            break
            
    if not main_video_track:
        raise ValueError("No main video track (flag: 0) found in draft.")
        
    segments = main_video_track.get('segments', [])
    if not segments:
        raise ValueError("Main video track has no segments.")
        
    # Get the material ID of the first segment
    first_segment = segments[0]
    material_id = first_segment.get('material_id')
    
    # Look up the material path
    materials = data.get('materials', {}).get('videos', [])
    video_path = None
    for mat in materials:
        if mat.get('id') == material_id:
            video_path = mat.get('path')
            break
            
    if not video_path:
        raise ValueError(f"Could not find video material with ID {material_id}")
        
    return {
        "project_path": project_path,
        "draft_json_path": draft_json_path,
        "video_path": video_path
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Read CapCut project and find the main video.")
    parser.add_argument("project_name", type=str, help="Name of the CapCut project folder")
    args = parser.parse_args()
    
    try:
        proj_path = get_capcut_project_path(args.project_name)
        result = extract_main_video(proj_path)
        print(json.dumps({"status": "success", "data": result}, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False))
        sys.exit(1)
