import json
import copy
import uuid

def apply_default_style(draft_data):
    """
    Applies the custom subtitle style (Kanit, Pop Up animation) to all subtitle texts in draft_data.
    Returns True if modifications were made.
    """
    # 1. Define the base style template
    style_template = {
        "text_curve": None,
        "text_loop_on_path": False,
        "offset_on_path": 0.0,
        "enable_path_typesetting": False,
        "text_exceeds_path_process_type": 0,
        "text_typesetting_paths": None,
        "text_typesetting_paths_file": "",
        "text_typesetting_path_index": 0,
        "line_spacing": 0.02,
        "has_shadow": True,
        "shadow_color": "#000000",
        "shadow_alpha": 0.47594934701919556,
        "shadow_smoothing": 0.45000000670552254,
        "shadow_distance": 4.999999523162842,
        "shadow_point": {
            "x": 0.636396042376431,
            "y": -0.636396042376431
        },
        "shadow_angle": -45.0,
        "shadow_thickness_projection_enable": False,
        "shadow_thickness_projection_angle": 0.0,
        "shadow_thickness_projection_distance": 0.0,
        "border_alpha": 1.0,
        "border_color": "#000000",
        "border_width": 0.05999999865889549,
        "border_mode": 0,
        "text_color": "#ffffff",
        "text_alpha": 1.0,
        "font_name": "",
        "font_title": "none",
        "font_size": 24.646854400634766,
        "font_path": "C:/Users/Admin/AppData/Local/CapCut/User Data/Cache/effect/7229975647517413890/3ec5e7299462f75576b039520299c405/Kanit-Regular.ttf",
        "font_id": "",
        "font_resource_id": "7229975647517413890",
        "bold_width": 0.00800000037997961,
        "italic_degree": 0,
        "underline": False,
        "underline_width": 0.05,
        "underline_offset": 0.22,
        "text_size": 30,
    }

    # Template for rich text 'content' field
    rich_text_style_template = {
        "bold": True,
        "fill": {
            "alpha": 1.0,
            "content": {
                "render_type": "solid",
                "solid": {
                    "alpha": 1.0,
                    "color": [1.0, 1.0, 1.0]
                }
            }
        },
        "font": {
            "id": "7229975647517413890",
            "path": "C:/Users/Admin/AppData/Local/CapCut/User Data/Cache/effect/7229975647517413890/3ec5e7299462f75576b039520299c405/Kanit-Regular.ttf"
        },
        "range": [0, 20],
        "shadows": [
            {
                "alpha": 0.47594934701919556,
                "angle": -45.0,
                "content": {
                    "render_type": "solid",
                    "solid": {
                        "alpha": 1.0,
                        "color": [0.0, 0.0, 0.0]
                    }
                },
                "diffuse": 0.02500000037252903,
                "distance": 4.999999523162842
            }
        ],
        "size": 24.646854400634766,
        "strokes": [
            {
                "alpha": 1.0,
                "content": {
                    "render_type": "solid",
                    "solid": {
                        "alpha": 1.0,
                        "color": [0.0, 0.0, 0.0]
                    }
                },
                "width": 0.05999999865889549
            }
        ],
        "useLetterColor": True
    }

    anim_template = {
        "id": "",
        "type": "sticker_animation",
        "animations": [
            {
                "id": "247362126",
                "type": "in",
                "start": 0,
                "duration": 66667,
                "path": "C:/Users/Admin/AppData/Local/CapCut/User Data/Cache/effect/247362126/5a89c2a5ca466cb946c5a81beb2efe77",
                "platform": "all",
                "resource_id": "7209405021744534018",
                "third_resource_id": "0",
                "source_platform": 0,
                "name": "Pop Up",
                "category_id": "ruchang_fav",
                "category_name": "Favorites",
                "panel": "",
                "material_type": "sticker",
                "anim_adjust_params": {
                    "direction": "up",
                    "anim_mode": ""
                },
                "request_id": ""
            }
        ],
        "multi_language_current": "none"
    }

    if "materials" not in draft_data or "texts" not in draft_data["materials"]:
        return False

    if "material_animations" not in draft_data["materials"]:
        draft_data["materials"]["material_animations"] = []

    texts = draft_data["materials"]["texts"]
    material_animations = draft_data["materials"]["material_animations"]

    modified = False

    # Find subtitle track segments to know which text materials belong to subtitles
    subtitle_materials_duration = {}
    for track in draft_data.get("tracks", []):
        if track.get("type") == "text":
            for seg in track.get("segments", []):
                mid = seg.get("material_id")
                if mid:
                    subtitle_materials_duration[mid] = seg.get("target_timerange", {}).get("duration", 0)

    for text_mat in texts:
        mid = text_mat.get("id")
        if mid not in subtitle_materials_duration:
            continue
            
        seg_duration_us = subtitle_materials_duration[mid]

        # 2. Update basic style properties
        for k, v in style_template.items():
            text_mat[k] = v

        # 3. Update rich text content
        raw_content = text_mat.get("content", "")
        if raw_content:
            try:
                content_obj = json.loads(raw_content)
                actual_text = content_obj.get("text", "")
                
                # Clone template and update length
                new_style = copy.deepcopy(rich_text_style_template)
                # length of UTF-16 characters or just string length for CapCut range
                new_style["range"] = [0, len(actual_text)]
                
                content_obj["styles"] = [new_style]
                text_mat["content"] = json.dumps(content_obj, ensure_ascii=False)
            except json.JSONDecodeError:
                pass

        # 4. Attach Animation
        anim_id = str(uuid.uuid4()).upper()
        new_anim = copy.deepcopy(anim_template)
        new_anim["id"] = anim_id
        
        # Calculate dynamic animation duration: max 0.4s, bounded by 80% of subtitle duration
        target_anim_dur = 400000  # 0.4 seconds in microseconds
        max_allowed_dur = int(seg_duration_us * 0.8)
        anim_dur = max(30000, min(target_anim_dur, max_allowed_dur)) # At least 0.03s
        new_anim["animations"][0]["duration"] = anim_dur
        
        material_animations.append(new_anim)

        # 5. Link animation to the corresponding segment
        for track in draft_data.get("tracks", []):
            if track.get("type") == "text":
                for seg in track.get("segments", []):
                    if seg.get("material_id") == text_mat.get("id"):
                        if "extra_material_refs" not in seg:
                            seg["extra_material_refs"] = []
                        # Ensure only one animation ref exists or append
                        seg["extra_material_refs"] = [ref for ref in seg["extra_material_refs"] if not any(ma.get("id") == ref and ma.get("type") == "sticker_animation" for ma in material_animations[:-1])]
                        seg["extra_material_refs"].append(anim_id)

        modified = True

    return modified
