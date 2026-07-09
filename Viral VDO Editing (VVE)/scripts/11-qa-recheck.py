import os
import sys
import json
import argparse
from pathlib import Path

def parse_capcut_json(draft_file):
    try:
        with open(draft_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Failed to parse JSON: {e}")
        return None

def check_subtitle(data):
    # 1. Check Subtitle
    tracks = data.get("tracks", [])
    text_segments = 0
    for t in tracks:
        if t.get("type") == "text":
            text_segments += len(t.get("segments", []))
    
    passed = text_segments > 0
    msg = f"{text_segments} segments found" if passed else "No text tracks or segments found!"
    return passed, msg

def check_subtitle_effect(data):
    # 2. Subtitle Effect (animations)
    texts = data.get("materials", {}).get("texts", [])
    for txt in texts:
        if txt.get("text_animations") or txt.get("animations"):
            return True, "Animation property found"
    return False, "No subtitle animations found!"

def check_subtitle_highlight(data):
    # 3. Subtitle Highlight (multi-style ranges with yellow color)
    texts = data.get("materials", {}).get("texts", [])
    for txt in texts:
        content = txt.get("content", "")
        try:
            content_dict = json.loads(content)
            styles = content_dict.get("styles", [])
            if len(styles) > 1:  # More than just the base style = has highlights
                return True, f"Highlight styles detected ({len(styles)-1} ranges)"
        except:
            pass
        # Fallback: check for color attributes in raw string
        if "color=" in content.lower() or "FFE600" in content:
            return True, "Highlight colors detected in text"
    return False, "No highlighted words found!"

def check_header_text(data):
    # 4. Header Text (text with large font or specific positioning)
    # Just checking if there are multiple text tracks or texts with scale > 1.0
    texts = data.get("materials", {}).get("texts", [])
    for txt in texts:
        # CapCut uses 'initial_scale' or similar
        scale = txt.get("initial_scale", 1.0)
        if scale > 1.5:
            return True, "Large header text detected"
    
    # Alternatively, if there's more than 1 text track, assume one is header
    text_tracks = [t for t in data.get("tracks", []) if t.get("type") == "text"]
    if len(text_tracks) > 1:
        return True, "Multiple text tracks found (assumed Header present)"
        
    return False, "No header text found (no large text / single track)!"

def check_duration_and_bgm(data):
    tracks = data.get("tracks", [])
    main_duration = 0
    
    # Calculate video duration
    for track in tracks:
        if track.get("type") == "video":
            for seg in track.get("segments", []):
                tr = seg.get("target_timerange", {})
                end_time = tr.get("start", 0) + tr.get("duration", 0)
                if end_time > main_duration:
                    main_duration = end_time
                    
    duration_secs = main_duration / 1_000_000
    
    # Check Duration
    dur_passed = 30 <= duration_secs <= 90
    dur_msg = f"{duration_secs:.1f}s (target 30-90s)" if dur_passed else f"{duration_secs:.1f}s (out of 30-90s range)!"
    
    # Check BGM
    bgm_passed = False
    bgm_msg = "No long BGM track found!"
    max_audio_duration = 0
    
    for track in tracks:
        if track.get("type") == "audio":
            for seg in track.get("segments", []):
                tr = seg.get("target_timerange", {})
                end_time = tr.get("start", 0) + tr.get("duration", 0)
                if end_time > max_audio_duration:
                    max_audio_duration = end_time
                    
    if max_audio_duration >= (main_duration * 0.8) and main_duration > 0:
        bgm_passed = True
        bgm_msg = f"Audio covers {(max_audio_duration/main_duration)*100:.0f}% of clip"
        
    return dur_passed, dur_msg, bgm_passed, bgm_msg

def check_transition(data):
    # 6. Check Transition
    transitions = data.get("materials", {}).get("transitions", [])
    if len(transitions) > 0:
        return True, f"{len(transitions)} transitions found"
    return False, "No transitions between B-Roll!"

def check_aroll_zoom(data):
    # 7. A-Roll & Zoom
    videos = data.get("materials", {}).get("videos", [])
    for vid in videos:
        # Check for keyframes
        keyframes = vid.get("keyframe_list", [])
        if len(keyframes) > 0:
            return True, "Zoom/Movement keyframes detected"
    return False, "No movement/zoom keyframes detected in A-Roll!"

def check_sfx(data):
    # 8. Check SFX (short audio < 2s)
    audios = data.get("materials", {}).get("audios", [])
    sfx_count = 0
    for aud in audios:
        duration = aud.get("duration", 0)
        if 0 < duration < 2_500_000: # Less than 2.5 seconds
            sfx_count += 1
            
    if sfx_count > 0:
        return True, f"{sfx_count} SFX placed"
    return False, "No short Sound Effects (<2.5s) found!"

def check_broll(data):
    # 9. Check B-Roll (Video Track >= 2)
    video_tracks = [t for t in data.get("tracks", []) if t.get("type") == "video"]
    if len(video_tracks) >= 2:
        return True, f"Track count: {len(video_tracks)} (Overlay/B-Roll present)"
    return False, "Only 1 video track found (No B-Roll overlays)!"

def check_audio_balance(data):
    # 11. Audio Balance (Voice vs BGM)
    # Typically, voice volume should be near 1.0 (0dB) and BGM should be lower
    # CapCut volume is a multiplier (1.0 = 100%) or dB. 
    # Just checking if any audio track has its volume lowered.
    audios = data.get("materials", {}).get("audios", [])
    videos = data.get("materials", {}).get("videos", [])
    
    # Very basic heuristic: Did user adjust volume?
    adjusted_count = 0
    for aud in audios:
        vol = aud.get("volume", 1.0)
        if vol < 0.5: # Lowered BGM
            adjusted_count += 1
            
    if adjusted_count > 0:
        return True, f"BGM volume adjustments detected"
    return False, "All audio tracks at 100% volume (BGM might be too loud!)"

def check_video_adjust(data):
    # 12. Video Adjust
    adjustments = data.get("materials", {}).get("video_track", []) # Sometime Capcut puts it here
    adjust_materials = data.get("materials", {}).get("adjustments", [])
    if len(adjustments) > 0 or len(adjust_materials) > 0:
        return True, "Color/Brightness adjustments found"
    
    # Check filters
    filters = data.get("materials", {}).get("video_effects", [])
    if len(filters) > 0:
        return True, "Video filters found"
        
    return False, "No video adjustments or filters applied!"

def check_beauty_filter(data):
    # 13. Beauty Filter
    videos = data.get("materials", {}).get("videos", [])
    for vid in videos:
        if vid.get("beauty_face_auto_preset"):
            return True, "Beauty/Face effects active"
            
    face_effects = data.get("materials", {}).get("face_effects", [])
    if len(face_effects) > 0:
        return True, "Beauty/Face effects active"
    return False, "No Beauty/Face effects applied!"

def check_audio_quality(data):
    # 14. Audio Quality (Noise Reduction)
    audios = data.get("materials", {}).get("audios", [])
    videos = data.get("materials", {}).get("videos", [])
    
    for mat in audios + videos:
        algo = mat.get("video_algorithm", {})
        if mat.get("audio_effects") or mat.get("noise_reduction", False) or mat.get("vocal_isolation") or algo.get("noise_reduction"):
            return True, "Audio enhancement/noise reduction active"
            
    return False, "No noise reduction or audio effects applied!"

def perform_qa_recheck(project_dir):
    proj_path = Path(project_dir)
    draft_file = proj_path / "template-2.tmp"
    if not draft_file.exists():
        draft_file = proj_path / "draft_content.json"
        
    if not draft_file.exists():
        print(f"❌ Error: CapCut draft not found in {project_dir}")
        return False

    print(f"Reading CapCut JSON: {draft_file.name}...\n")
    data = parse_capcut_json(draft_file)
    if not data:
        return False

    dur_pass, dur_msg, bgm_pass, bgm_msg = check_duration_and_bgm(data)

    checks = [
        ("Subtitle", *check_subtitle(data)),
        ("Subtitle Effect", *check_subtitle_effect(data)),
        ("Subtitle Highlight", *check_subtitle_highlight(data)),
        ("Header Text", *check_header_text(data)),
        ("BGM", bgm_pass, bgm_msg),
        ("Transition", *check_transition(data)),
        ("A-Roll & Zoom", *check_aroll_zoom(data)),
        ("SFX", *check_sfx(data)),
        ("B-Roll", *check_broll(data)),
        ("Duration", dur_pass, dur_msg),
        ("Audio Balance", *check_audio_balance(data)),
        ("Video Adjust", *check_video_adjust(data)),
        ("Beauty Filter", *check_beauty_filter(data))
    ]
    
    print(f"╔════════════════════════════════════════════════════════════╗")
    print(f"║                   QA RECHECK REPORT                        ║")
    print(f"╠════════════════════════════════════════════════════════════╣")
    
    passed_count = sum(1 for name, status, msg in checks if status)
    total_count = len(checks)
    all_passed = passed_count == total_count
    
    for name, status, msg in checks:
        icon = "✅" if status else "❌"
        # Pad strings for nice table formatting
        name_padded = f"{name:<20}"
        print(f"║ {icon} {name_padded} │ {msg:<32} ║")
    
    print(f"╠════════════════════════════════════════════════════════════╣")
    print(f"║ Score: {passed_count}/{total_count}                                               ║")
    
    if not all_passed:
        print(f"║ ❌ FIX REQUIRED BEFORE PROCEEDING!                         ║")
    else:
        print(f"║ ✅ ALL QA PASSED!                                          ║")
        
    print(f"╚════════════════════════════════════════════════════════════╝")
    
    return all_passed

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
    try:
        from registry import get_active_project, update_step
    except ImportError:
        print("❌ Error: Could not import utils modules.")
        sys.exit(1)
        
    parser = argparse.ArgumentParser()
    parser.add_argument("job_dir", nargs="?", help="Path to job directory")
    parser.add_argument("--project", help="Path to CapCut project folder", default=None)
    args = parser.parse_args()
    
    input_arg = args.job_dir
    if not input_arg:
        input_arg = get_active_project()
        if not input_arg:
            print("Usage: python 11-qa-recheck.py <job_dir>")
            sys.exit(1)
        print(f"📌 Using active project: {input_arg}")
        
    update_step(input_arg, "11", "wip")
    
    proj_dir = args.project if args.project else input_arg
    
    if not os.path.exists(proj_dir):
        try:
            from utils.capcut_utils import get_project_path
            proj_dir = get_project_path(input_arg)
        except Exception:
            pass
    
    passed = perform_qa_recheck(proj_dir)
    if passed:
        update_step(input_arg, "11", "done")
    else:
        sys.exit(1)
