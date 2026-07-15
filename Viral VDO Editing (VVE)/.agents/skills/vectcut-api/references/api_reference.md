# VectCutAPI Reference — Complete API Parameters

> Auto-generated from https://github.com/sun-guannan/VectCutAPI

## POST /create_draft

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| width | int | No | 1080 | Video width in pixels |
| height | int | No | 1920 | Video height in pixels |
| draft_folder | string | No | auto | Draft folder path |

**Response:**
```json
{
  "success": true,
  "output": {
    "draft_id": "draft_1234567890",
    "draft_folder": "dfd_xxxxx"
  }
}
```

---

## POST /save_draft

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| draft_id | string | Yes | Draft ID from create_draft |
| draft_folder | string | No | Draft folder path |

**Response:**
```json
{
  "success": true,
  "output": {
    "draft_url": "https://example.com/draft/downloader?id=xxx",
    "draft_folder": "dfd_xxxxx",
    "message": "Draft saved"
  }
}
```

---

## POST /query_draft_status

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| draft_id | string | Yes | Draft ID |

---

## POST /query_script

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| draft_id | string | Yes | Draft ID |

---

## POST /add_video

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| draft_id | string | **required** | Draft ID |
| video_url | string | **required** | Video URL (local path or remote URL) |
| start | float | 0 | Source clip start time (seconds) |
| end | float | 0 | Source clip end time (seconds, 0 = full) |
| target_start | float | 0 | Position on timeline (seconds) |
| speed | float | 1.0 | Playback speed multiplier |
| volume | float | 1.0 | Volume level (0.0–1.0) |
| scale_x | float | 1.0 | Horizontal scale factor |
| scale_y | float | 1.0 | Vertical scale factor |
| transform_x | float | 0 | Horizontal position offset (-1.0 to 1.0) |
| transform_y | float | 0 | Vertical position offset (-1.0 to 1.0) |
| track_name | string | "video_main" | Track identifier |
| relative_index | int | 0 | Track relative index |
| duration | float | auto | Override duration |
| transition | string | None | Transition type (see below) |
| transition_duration | float | 0.5 | Transition duration (seconds) |
| mask_type | string | None | Mask type (see below) |
| mask_center_x | float | 0.5 | Mask center X |
| mask_center_y | float | 0.5 | Mask center Y |
| mask_size | float | 1.0 | Mask size |
| mask_rotation | float | 0.0 | Mask rotation angle |
| mask_feather | float | 0.0 | Mask feather |
| mask_invert | bool | False | Invert mask |
| background_blur | int | None | Background blur level (1–4) |

### Transition Types
- `fade_in`, `fade_out`
- `wipe_left`, `wipe_right`, `wipe_up`, `wipe_down`
- More via `GET /get_transition_types`

### Mask Types
- `circle`, `rect`, `linear`
- More via `GET /get_mask_types`

---

## POST /add_audio

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| draft_id | string | **required** | Draft ID |
| audio_url | string | **required** | Audio URL |
| volume | float | 1.0 | Volume level (0.0–1.0) |
| speed | float | 1.0 | Playback speed |
| start | float | 0 | Clip start time |
| end | float | 0 | Clip end time |
| target_start | float | 0 | Timeline position |

---

## POST /add_image

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| draft_id | string | **required** | Draft ID |
| image_url | string | **required** | Image URL |
| start | float | 0 | Start time on timeline |
| end | float | auto | End time on timeline |
| animation_type | string | None | Animation type |
| transition | string | None | Transition type |
| transition_duration | float | 0.5 | Transition duration |
| scale_x | float | 1.0 | Horizontal scale |
| scale_y | float | 1.0 | Vertical scale |
| transform_x | float | 0 | Horizontal offset |
| transform_y | float | 0 | Vertical offset |

---

## POST /add_text

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| draft_id | string | **required** | Draft ID |
| text | string | **required** | Text content |
| start | float | 0 | Start time (seconds) |
| end | float | 5 | End time (seconds) |
| font_size | int | 48 | Font size |
| font_color | string | "#FFFFFF" | Hex color |
| shadow_enabled | bool | False | Enable text shadow |
| shadow_color | string | "#000000" | Shadow hex color |
| shadow_distance | int | 8 | Shadow distance |
| background_color | string | None | Background hex color |
| background_alpha | float | 0 | Background opacity (0.0–1.0) |
| background_round_radius | int | 0 | Corner radius |
| text_intro | string | None | Intro animation |
| text_outro | string | None | Outro animation |
| pos_x | float | 0 | X position (-1.0 to 1.0) |
| pos_y | float | 0 | Y position (-1.0 to 1.0) |
| alignment_h | string | "center" | "left", "center", "right" |
| stroke_enabled | bool | False | Enable stroke |
| stroke_color | string | "#000000" | Stroke color |
| stroke_width | float | 0 | Stroke width |

---

## POST /add_subtitle

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| draft_id | string | **required** | Draft ID |
| srt_url | string | **required** | SRT file URL |
| font_size | int | 36 | Font size |
| font_color | string | "#FFFFFF" | Font color |
| stroke_enabled | bool | False | Enable stroke |
| stroke_color | string | "#000000" | Stroke color |
| stroke_width | float | 0 | Stroke width |
| background_alpha | float | 0 | Background opacity |
| pos_y | float | -0.35 | Vertical position |

---

## POST /add_effect

| Param | Type | Description |
|-------|------|-------------|
| draft_id | string | Draft ID |
| effect_type | string | Effect type identifier |
| parameters | object | Effect-specific parameters |
| duration | float | Effect duration |

---

## POST /add_sticker

| Param | Type | Description |
|-------|------|-------------|
| draft_id | string | Draft ID |
| resource_id | string | Sticker resource identifier |
| position | object | Position settings |
| scale | float | Scale factor |
| rotation | float | Rotation angle |

---

## POST /add_video_keyframe

| Param | Type | Description |
|-------|------|-------------|
| draft_id | string | Draft ID |
| track_name | string | Target track |
| property_types | list[string] | Properties: "scale_x", "scale_y", "alpha", "rotation", "transform_x", "transform_y" |
| times | list[float] | Keyframe timestamps (seconds) |
| values | list[string] | Comma-separated values per timestamp (one value per property_type) |

**Example — Zoom + Fade:**
```json
{
  "draft_id": "draft_123",
  "track_name": "video_main",
  "property_types": ["scale_x", "scale_y", "alpha"],
  "times": [0, 5, 10],
  "values": ["1.0,1.0,1.0", "1.3,1.3,1.0", "1.0,1.0,0.8"]
}
```

---

## GET Query Endpoints

| Endpoint | Returns |
|----------|---------|
| `/get_intro_animation_types` | List of intro animation type strings |
| `/get_outro_animation_types` | List of outro animation type strings |
| `/get_transition_types` | List of transition type strings |
| `/get_mask_types` | List of mask type strings |
| `/get_audio_effect_types` | List of audio effect type strings |
| `/get_font_types` | List of available font type strings |
| `/get_video_scene_effect_types` | List of scene effect type strings |
