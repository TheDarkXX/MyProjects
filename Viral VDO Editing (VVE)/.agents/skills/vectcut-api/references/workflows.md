# VectCutAPI Workflow Recipes

> Ready-to-use Python recipes for common video editing patterns.
> All examples assume `BASE_URL = "http://localhost:9001"`

---

## Recipe 1: Basic Portrait Video (BGM + Title + Description)

```python
import requests
BASE_URL = "http://localhost:9001"

# 1. Create portrait draft
draft = requests.post(f"{BASE_URL}/create_draft", json={
    "width": 1080, "height": 1920
}).json()
draft_id = draft["output"]["draft_id"]

# 2. Background video
requests.post(f"{BASE_URL}/add_video", json={
    "draft_id": draft_id,
    "video_url": "https://example.com/background.mp4",
    "start": 0, "end": 30, "volume": 0.5
})

# 3. BGM
requests.post(f"{BASE_URL}/add_audio", json={
    "draft_id": draft_id,
    "audio_url": "https://example.com/bgm.mp3",
    "volume": 0.3
})

# 4. Animated title
requests.post(f"{BASE_URL}/add_text", json={
    "draft_id": draft_id, "text": "Video Title",
    "start": 0, "end": 5, "font_size": 64, "font_color": "#FFD700",
    "shadow_enabled": True, "shadow_color": "#000000", "shadow_distance": 10,
    "background_color": "#000000", "background_alpha": 0.7,
    "background_round_radius": 20,
    "text_intro": "fade_in", "text_outro": "zoom_out"
})

# 5. Description text
requests.post(f"{BASE_URL}/add_text", json={
    "draft_id": draft_id, "text": "Description text here",
    "start": 2, "end": 30, "font_size": 36, "font_color": "#FFFFFF",
    "pos_y": -0.3, "alignment_h": "center"
})

# 6. Save
result = requests.post(f"{BASE_URL}/save_draft", json={"draft_id": draft_id}).json()
print(f"Draft URL: {result['output']['draft_url']}")
```

---

## Recipe 2: Text-to-Video (Multi-Segment Colored Text)

```python
def create_text_to_video(text_content, bg_video_url, bgm_url):
    draft = requests.post(f"{BASE_URL}/create_draft", json={
        "width": 1080, "height": 1920
    }).json()
    draft_id = draft["output"]["draft_id"]

    requests.post(f"{BASE_URL}/add_video", json={
        "draft_id": draft_id, "video_url": bg_video_url, "volume": 0.4
    })
    requests.post(f"{BASE_URL}/add_audio", json={
        "draft_id": draft_id, "audio_url": bgm_url, "volume": 0.3
    })

    segments = [s.strip() for s in text_content.split("\n") if s.strip()]
    colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"]
    current_time = 1
    duration_per_segment = 4

    for i, segment in enumerate(segments):
        requests.post(f"{BASE_URL}/add_text", json={
            "draft_id": draft_id, "text": segment,
            "start": current_time, "end": current_time + duration_per_segment,
            "font_size": 48, "font_color": colors[i % len(colors)],
            "shadow_enabled": True, "shadow_color": "#000000", "shadow_distance": 8,
            "background_color": "#000000", "background_alpha": 0.6,
            "background_round_radius": 15,
            "text_intro": "zoom_in", "text_outro": "fade_out"
        })
        current_time += duration_per_segment

    result = requests.post(f"{BASE_URL}/save_draft", json={"draft_id": draft_id}).json()
    return result["output"]["draft_url"]
```

---

## Recipe 3: Video Mashup with Transitions

```python
def create_video_mashup(video_clips, add_transitions=True):
    draft = requests.post(f"{BASE_URL}/create_draft", json={
        "width": 1080, "height": 1920
    }).json()
    draft_id = draft["output"]["draft_id"]

    current_time = 0
    transitions = ["fade_in", "wipe_left", "wipe_right", "wipe_up", "wipe_down"]

    for i, clip in enumerate(video_clips):
        transition = transitions[i % len(transitions)] if add_transitions and i > 0 else None
        requests.post(f"{BASE_URL}/add_video", json={
            "draft_id": draft_id, "video_url": clip["url"],
            "start": 0, "end": clip["duration"],
            "target_start": current_time,
            "transition": transition, "transition_duration": 0.5,
            "volume": 1.0
        })
        current_time += clip["duration"]

    result = requests.post(f"{BASE_URL}/save_draft", json={"draft_id": draft_id}).json()
    return result["output"]["draft_url"]

# Usage:
# clips = [{"url": "clip1.mp4", "duration": 5}, {"url": "clip2.mp4", "duration": 4}]
# create_video_mashup(clips)
```

---

## Recipe 4: Video with SRT Subtitles

```python
def create_video_with_subtitles(video_url, srt_url):
    draft = requests.post(f"{BASE_URL}/create_draft", json={
        "width": 1920, "height": 1080  # Landscape
    }).json()
    draft_id = draft["output"]["draft_id"]

    requests.post(f"{BASE_URL}/add_video", json={
        "draft_id": draft_id, "video_url": video_url
    })

    requests.post(f"{BASE_URL}/add_subtitle", json={
        "draft_id": draft_id, "srt_url": srt_url,
        "font_size": 36, "font_color": "#FFFFFF",
        "stroke_enabled": True, "stroke_color": "#000000", "stroke_width": 4.0,
        "background_alpha": 0.5, "pos_y": -0.35
    })

    result = requests.post(f"{BASE_URL}/save_draft", json={"draft_id": draft_id}).json()
    return result["output"]["draft_url"]
```

---

## Recipe 5: Image Slideshow with Keyframe Animation

```python
def create_image_animation(image_url, duration=10):
    draft = requests.post(f"{BASE_URL}/create_draft", json={
        "width": 1080, "height": 1920
    }).json()
    draft_id = draft["output"]["draft_id"]

    # Add image
    requests.post(f"{BASE_URL}/add_image", json={
        "draft_id": draft_id, "image_url": image_url,
        "start": 0, "end": duration, "animation_type": "fade_in"
    })

    # Keyframe: scale 1.0→1.3→1.0, alpha 1.0→1.0→0.8
    requests.post(f"{BASE_URL}/add_video_keyframe", json={
        "draft_id": draft_id, "track_name": "video_main",
        "property_types": ["scale_x", "scale_y", "alpha"],
        "times": [0, duration/2, duration],
        "values": ["1.0,1.0,1.0", "1.3,1.3,1.0", "1.0,1.0,0.8"]
    })

    result = requests.post(f"{BASE_URL}/save_draft", json={"draft_id": draft_id}).json()
    return result["output"]["draft_url"]
```

---

## Recipe 6: Split-Screen Comparison

```python
def create_split_screen(left_video, right_video, duration=10):
    draft = requests.post(f"{BASE_URL}/create_draft", json={
        "width": 1920, "height": 1080  # Landscape for split
    }).json()
    draft_id = draft["output"]["draft_id"]

    # Left half
    requests.post(f"{BASE_URL}/add_video", json={
        "draft_id": draft_id, "video_url": left_video,
        "start": 0, "end": duration,
        "scale_x": 0.7, "scale_y": 0.7, "transform_x": -0.25
    })

    # Right half
    requests.post(f"{BASE_URL}/add_video", json={
        "draft_id": draft_id, "video_url": right_video,
        "start": 0, "end": duration,
        "scale_x": 0.7, "scale_y": 0.7, "transform_x": 0.25
    })

    result = requests.post(f"{BASE_URL}/save_draft", json={"draft_id": draft_id}).json()
    return result["output"]["draft_url"]
```

---

## Recipe 7: Product Showcase Video

```python
def create_product_video(product_info):
    draft = requests.post(f"{BASE_URL}/create_draft", json={
        "width": 1080, "height": 1920
    }).json()
    draft_id = draft["output"]["draft_id"]

    # Demo video + BGM
    requests.post(f"{BASE_URL}/add_video", json={
        "draft_id": draft_id, "video_url": product_info["demo_video"],
        "transition": "fade_in", "transition_duration": 1.0, "volume": 0.5
    })
    requests.post(f"{BASE_URL}/add_audio", json={
        "draft_id": draft_id, "audio_url": product_info["bgm"], "volume": 0.3
    })

    # Product name
    requests.post(f"{BASE_URL}/add_text", json={
        "draft_id": draft_id, "text": product_info["name"],
        "start": 0, "end": 4, "font_size": 72, "font_color": "#FFD700",
        "shadow_enabled": True, "background_color": "#1E1E1E",
        "background_alpha": 0.8, "background_round_radius": 30,
        "text_intro": "zoom_in", "pos_y": 0.3
    })

    # Feature bullets
    for i, feature in enumerate(product_info.get("features", [])):
        start_time = 3 + i * 3
        requests.post(f"{BASE_URL}/add_text", json={
            "draft_id": draft_id, "text": f"• {feature}",
            "start": start_time, "end": start_time + 4,
            "font_size": 40, "font_color": "#FFFFFF",
            "background_alpha": 0.6, "alignment_h": "left",
            "pos_x": -0.35, "pos_y": 0.1 + i * 0.1
        })

    result = requests.post(f"{BASE_URL}/save_draft", json={"draft_id": draft_id}).json()
    return result["output"]["draft_url"]
```

---

## Best Practices

### Timeline Management
```python
current_time = 0
# After each add_video: current_time += clip_duration
```

### Error Handling
```python
def safe_api_call(endpoint, payload):
    try:
        resp = requests.post(f"{BASE_URL}{endpoint}", json=payload)
        result = resp.json()
        if not result.get("success"):
            print(f"API Error: {result.get('error')}")
            return None
        return result
    except Exception as e:
        print(f"Exception: {e}")
        return None
```

### Pre-check Media Duration
```python
duration_resp = requests.post(f"{BASE_URL}/get_duration", json={
    "media_url": video_url
})
duration = duration_resp.json()["output"]["duration"]
```
