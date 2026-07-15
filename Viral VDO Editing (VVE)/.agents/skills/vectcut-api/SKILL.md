---
name: vectcut-api
description: VectCutAPI cloud-based video editing via HTTP REST or MCP. Use when the user needs to programmatically create CapCut/JianYing drafts, add video/audio/image/text/subtitle/effect/sticker/keyframes, save and preview drafts, or integrate with n8n/Coze/Dify workflows for automated batch video production.
---

# VectCutAPI — Cloud Video Editing Skill

> **Source**: https://github.com/sun-guannan/VectCutAPI
> **License**: Apache-2.0

## Overview

VectCutAPI เป็น **toAgent** video editing API ที่ให้ AI สร้าง/แก้ไข Draft ของ CapCut (International) หรือ 剪映/JianYing (China) ผ่าน HTTP REST หรือ MCP Protocol ได้เลย ไม่ต้อง GUI

### Core Value for VVE Project

- **ปัจจุบัน VVE** ใช้ local `draft_content.json` manipulation ผ่าน hypercut skill
- **VectCutAPI เสริม** ตรงที่ให้ Cloud preview, multi-track editing, keyframe animation, และ batch export ผ่าน API โดยไม่ต้องเปิด CapCut

### Key Capabilities

| Module | HTTP API | MCP | Description |
|--------|----------|-----|-------------|
| Draft Management | ✅ | ✅ | Create, save, query, generate preview URL |
| Video Processing | ✅ | ✅ | Import, clip, transition, effects, mask, blur |
| Audio Editing | ✅ | ✅ | Audio tracks, volume, speed, effects |
| Image Processing | ✅ | ✅ | Import, animation, masks, filters |
| Text Editing | ✅ | ✅ | Multi-style text, shadows, backgrounds, animations |
| Subtitle System | ✅ | ✅ | SRT import, style, time sync |
| Effects Engine | ✅ | ✅ | Visual effects, filters, transitions |
| Sticker System | ✅ | ✅ | Sticker assets, position, animation |
| Keyframes | ✅ | ✅ | Property animation, timeline, easing |
| Media Analysis | ✅ | ✅ | Get video duration, detect format |

---

## System Requirements

- Python 3.10+
- CapCut (International) หรือ 剪映/JianYing (China)
- FFmpeg (optional, for some media processing)

## Setup

```bash
# Clone & install
git clone https://github.com/sun-guannan/VectCutAPI.git
cd VectCutAPI
python -m venv venv-capcut
venv-capcut\Scripts\activate   # Windows

pip install -r requirements.txt       # HTTP API
pip install -r requirements-mcp.txt   # MCP protocol (optional)

# Config
cp config.json.example config.json
# Edit config.json → set draft_profile, port, etc.
```

### Config Profiles

| Profile | Use Case |
|---------|----------|
| `capcut_legacy` | CapCut International (default) |
| `jianying_legacy` | JianYing (剪映) older versions |
| `jianying_pro_10` | JianYing Pro 10.x |

### Start Services

```bash
python capcut_server.py   # HTTP API → port 9001
python mcp_server.py      # MCP protocol → stdio
```

---

## Standard Workflow

```
1. create_draft → get draft_id
2. add_video / add_audio / add_image → build tracks
3. add_text / add_subtitle → overlay text
4. add_effect / add_sticker / add_video_keyframe → polish
5. save_draft → get preview URL or downloadable draft
```

### AI Video Generation Pipeline

```
AI Script → TTS (audio_url) → Image-to-Video (video_url)
    ↓
VectCutAPI compose draft
    ↓
Export or further edit in CapCut
```

---

## HTTP API Reference

**Base URL**: `http://localhost:9001`

### Core Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/create_draft` | POST | Create new draft project |
| `/save_draft` | POST | Save draft → generate URL |
| `/query_draft_status` | POST | Query draft status |
| `/query_script` | POST | Query draft script content |
| `/generate_draft_url` | POST | Generate preview URL |

### Material Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/add_video` | POST | Add video track |
| `/add_audio` | POST | Add audio track |
| `/add_image` | POST | Add image material |
| `/add_text` | POST | Add text element |
| `/add_subtitle` | POST | Add SRT subtitles |
| `/add_sticker` | POST | Add sticker |
| `/add_effect` | POST | Add video effect |
| `/add_video_keyframe` | POST | Add keyframe animation |

### Query Endpoints (GET)

| Endpoint | Description |
|----------|-------------|
| `/get_intro_animation_types` | Intro animation types |
| `/get_outro_animation_types` | Outro animation types |
| `/get_transition_types` | Transition effects |
| `/get_mask_types` | Mask types |
| `/get_audio_effect_types` | Audio effect types |
| `/get_font_types` | Font types |
| `/get_video_scene_effect_types` | Scene effect types |

---

## Key API Parameters

### POST /create_draft

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| width | int | No | 1080 | Video width |
| height | int | No | 1920 | Video height |
| draft_folder | string | No | - | Draft folder path |

**Common Resolutions:**
- `1080×1920` — Portrait (TikTok/Shorts)
- `1920×1080` — Landscape (YouTube)
- `1080×1080` — Square (Instagram)

### POST /add_video

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| draft_id | string | **required** | Draft ID |
| video_url | string | **required** | Video URL (local or remote) |
| start | float | 0 | Clip start time (seconds) |
| end | float | 0 | Clip end time (seconds) |
| target_start | float | 0 | Timeline position |
| speed | float | 1.0 | Playback speed |
| volume | float | 1.0 | Volume (0.0–1.0) |
| scale_x | float | 1.0 | Horizontal scale |
| scale_y | float | 1.0 | Vertical scale |
| transform_x | float | 0 | Horizontal offset |
| transform_y | float | 0 | Vertical offset |
| track_name | string | "video_main" | Track name |
| transition | string | - | Transition type |
| transition_duration | float | 0.5 | Transition duration (s) |
| mask_type | string | - | Mask type |
| mask_center_x/y | float | 0.5 | Mask center |
| mask_size | float | 1.0 | Mask size |
| mask_feather | float | 0.0 | Mask feather |
| mask_invert | bool | False | Invert mask |
| background_blur | int | - | Background blur (1–4) |

### POST /add_text

| Param | Type | Description |
|-------|------|-------------|
| draft_id | string | Draft ID |
| text | string | Text content |
| start / end | float | Time range (seconds) |
| font_size | int | Font size |
| font_color | string | Hex color (e.g. "#FFD700") |
| shadow_enabled | bool | Enable shadow |
| shadow_color | string | Shadow hex color |
| shadow_distance | int | Shadow distance |
| background_color | string | Background hex color |
| background_alpha | float | Background opacity (0.0–1.0) |
| background_round_radius | int | Corner radius |
| text_intro | string | Intro animation ("fade_in", "zoom_in", etc.) |
| text_outro | string | Outro animation ("fade_out", "zoom_out", etc.) |
| pos_x / pos_y | float | Position (-1.0 to 1.0) |
| alignment_h | string | Horizontal alignment ("left", "center", "right") |
| stroke_enabled | bool | Enable text stroke |
| stroke_color | string | Stroke hex color |
| stroke_width | float | Stroke width |

### POST /add_subtitle

| Param | Type | Description |
|-------|------|-------------|
| draft_id | string | Draft ID |
| srt_url | string | SRT file URL |
| font_size | int | Font size |
| font_color | string | Hex color |
| stroke_enabled | bool | Enable stroke |
| stroke_color | string | Stroke color |
| stroke_width | float | Stroke width |
| background_alpha | float | Background opacity |
| pos_y | float | Vertical position |

### POST /add_video_keyframe

| Param | Type | Description |
|-------|------|-------------|
| draft_id | string | Draft ID |
| track_name | string | Target track name |
| property_types | list[string] | Properties: "scale_x", "scale_y", "alpha", etc. |
| times | list[float] | Keyframe times (seconds) |
| values | list[string] | Comma-separated values per keyframe |

---

## MCP Protocol

### Configuration (mcp_config.json)

```json
{
  "mcpServers": {
    "capcut-api": {
      "command": "python3.10",
      "args": ["mcp_server.py"],
      "cwd": "/path/to/VectCutAPI",
      "env": {
        "PYTHONPATH": "/path/to/VectCutAPI"
      }
    }
  }
}
```

### Available MCP Tools (11 Tools)

| Tool | Key Parameters |
|------|----------------|
| `create_draft` | width, height |
| `add_text` | text, font_size, color, shadow, background |
| `add_video` | video_url, start, end, transform, volume |
| `add_audio` | audio_url, volume, speed, effects |
| `add_image` | image_url, transform, animation, transition |
| `add_subtitle` | srt_path, font_style, position |
| `add_effect` | effect_type, parameters, duration |
| `add_sticker` | resource_id, position, scale, rotation |
| `add_video_keyframe` | property_types, times, values |
| `get_video_duration` | video_url |
| `save_draft` | draft_id |

---

## Common Workflow Examples

### 1. Basic Portrait Video with BGM + Title

```python
import requests
BASE_URL = "http://localhost:9001"

# Create draft
draft = requests.post(f"{BASE_URL}/create_draft", json={"width": 1080, "height": 1920}).json()
draft_id = draft["output"]["draft_id"]

# Add background video
requests.post(f"{BASE_URL}/add_video", json={
    "draft_id": draft_id, "video_url": "https://example.com/bg.mp4",
    "start": 0, "end": 30, "volume": 0.5
})

# Add BGM
requests.post(f"{BASE_URL}/add_audio", json={
    "draft_id": draft_id, "audio_url": "https://example.com/bgm.mp3", "volume": 0.3
})

# Add title with animation
requests.post(f"{BASE_URL}/add_text", json={
    "draft_id": draft_id, "text": "Video Title",
    "start": 0, "end": 5, "font_size": 64, "font_color": "#FFD700",
    "shadow_enabled": True, "text_intro": "fade_in", "text_outro": "zoom_out"
})

# Save
result = requests.post(f"{BASE_URL}/save_draft", json={"draft_id": draft_id}).json()
print(f"Draft URL: {result['output']['draft_url']}")
```

### 2. Video Mashup with Transitions

```python
clips = [
    {"url": "clip1.mp4", "duration": 5},
    {"url": "clip2.mp4", "duration": 4},
    {"url": "clip3.mp4", "duration": 6},
]
transitions = ["fade_in", "wipe_left", "wipe_right", "wipe_up"]
current_time = 0

for i, clip in enumerate(clips):
    requests.post(f"{BASE_URL}/add_video", json={
        "draft_id": draft_id, "video_url": clip["url"],
        "start": 0, "end": clip["duration"], "target_start": current_time,
        "transition": transitions[i % len(transitions)] if i > 0 else None,
        "transition_duration": 0.5
    })
    current_time += clip["duration"]
```

### 3. Video with SRT Subtitles

```python
requests.post(f"{BASE_URL}/add_subtitle", json={
    "draft_id": draft_id, "srt_url": "https://example.com/subs.srt",
    "font_size": 36, "font_color": "#FFFFFF",
    "stroke_enabled": True, "stroke_color": "#000000", "stroke_width": 4.0,
    "background_alpha": 0.5, "pos_y": -0.35
})
```

### 4. Keyframe Animation (Zoom + Fade)

```python
requests.post(f"{BASE_URL}/add_video_keyframe", json={
    "draft_id": draft_id, "track_name": "video_main",
    "property_types": ["scale_x", "scale_y", "alpha"],
    "times": [0, 5, 10],
    "values": ["1.0,1.0,1.0", "1.3,1.3,1.0", "1.0,1.0,0.8"]
})
```

---

## Best Practices

1. **Track current_time** — Always maintain a variable to avoid timeline overlaps
2. **Error handling** — Check `response.json()["success"]` before proceeding
3. **Pre-check duration** — Use `/get_duration` before clipping
4. **Batch operations** — Use loops with config dicts for repetitive text/video additions
5. **Resolution consistency** — Match source material aspect ratio with draft resolution

## Integration with VVE Pipeline

VectCutAPI can complement the existing VVE `hypercut` skill:

- **hypercut** → local `draft_content.json` manipulation (offline, direct CapCut control)
- **vectcut-api** → cloud API for preview, multi-track, and batch production

Potential integration flow:
```
VVE transcript pipeline → editorial decisions
    ↓
VectCutAPI create_draft + add_video (trimmed segments)
    + add_subtitle (clean SRT) + add_audio (BGM)
    ↓
save_draft → preview URL or import to CapCut
```
