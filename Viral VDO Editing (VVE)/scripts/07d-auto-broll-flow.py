#!/usr/bin/env python3
"""
07d-auto-broll-flow.py — Automated B-Roll Generator & QA Pipeline via FlowKit

Bridges the gap between 07c (B-Roll Prompts) and 08 (Footage Assembler).
- Reads scene_table.json to find all B-Roll scenes.
- Submits Text-to-Video generation to FlowKit (Veo 3.1 / Omni Flash, 0 credit tier).
- Downloads MP4 footage into target project folder.
- Runs L1 QA: File integrity, duration match, black frame / freeze detection.
- Extracts 3 keyframes per video for L2 QA.
- Runs L2 QA: Native Antigravity Agent Vision Review (Built-in Gemini 3.8 Flash High)
  or optional Gemini API judge.
- Up to max_retries automatic retries on quality failure.
- Pauses cleanly (exit 100) if FlowKit server is offline.
"""

import os
import sys
import json
import time
import re
import argparse
import urllib.request
import urllib.error
from pathlib import Path

# Add scripts and utils to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.append(str(SCRIPT_DIR))
sys.path.append(str(SCRIPT_DIR / "utils"))

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

try:
    from config_loader import load_channel_config
except ImportError:
    def load_channel_config(): return {}

try:
    from registry import get_active_project, update_step, load_registry
    from capcut_utils import get_project_path, get_draft_path
    from snapshot import save_snapshot
    from backup import insurance_backup
except ImportError:
    def get_active_project(): return ""
    def update_step(a, b, c): pass
    def load_registry(): return {}
    def get_project_path(p): return str(p)
    def get_draft_path(p): return str(p)
    def save_snapshot(p, d, s): pass
    def insurance_backup(p): pass

# Exit code for clean pipeline pause
EXIT_CODE_PAUSE = 100


# ─── FlowKit API Client ──────────────────────────────────────────────────────────

# ─── FlowKit API Client ──────────────────────────────────────────────────────────

class FlowKitClient:
    def __init__(self, base_url: str = "http://127.0.0.1:8100", project_id: str = ""):
        self.base_url = base_url.rstrip("/")
        self.project_id = project_id

    def check_health(self) -> dict:
        url = f"{self.base_url}/health"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "VVE-07d/1.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if not data.get("extension_connected"):
                    data["status"] = "extension_disconnected"
                return data
        except Exception as e:
            return {"status": "offline", "error": str(e)}

    def generate_image(self, prompt: str, project_id: str = "", aspect_ratio: str = "9:16") -> dict:
        """Step 1 for Veo 3.1: Text-to-Image generation to obtain start_image_media_id."""
        ratio_map = {
            "9:16": "IMAGE_ASPECT_RATIO_PORTRAIT",
            "16:9": "IMAGE_ASPECT_RATIO_LANDSCAPE",
            "1:1": "IMAGE_ASPECT_RATIO_SQUARE"
        }
        endpoint = f"{self.base_url}/api/flow/generate-image"
        payload = {
            "prompt": prompt,
            "project_id": project_id or self.project_id,
            "aspect_ratio": ratio_map.get(aspect_ratio, "IMAGE_ASPECT_RATIO_PORTRAIT"),
            "user_paygate_tier": "PAYGATE_TIER_FREE"
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "VVE-07d/1.0"}
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                media_list = res.get("media", [])
                if media_list and isinstance(media_list, list):
                    first_m = media_list[0]
                    media_id = (
                        first_m.get("mediaId")
                        or first_m.get("name")
                        or first_m.get("image", {}).get("generatedImage", {}).get("mediaId")
                    )
                    image_url = (
                        first_m.get("imageUrl")
                        or first_m.get("image", {}).get("generatedImage", {}).get("fifeUrl")
                    )
                    if media_id:
                        return {"status": "SUCCESS", "media_id": media_id, "image_url": image_url}
                elif res.get("mediaId"):
                    return {"status": "SUCCESS", "media_id": res.get("mediaId"), "image_url": res.get("imageUrl")}
                return {"error": f"No mediaId in image gen response: {res}"}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            return {"error": f"HTTP {e.code}: {err_body}"}
        except Exception as e:
            return {"error": str(e)}

    def submit_veo_i2v(self, image_media_id: str, prompt: str, project_id: str = "",
                       aspect_ratio: str = "9:16", duration_s: int = 8,
                       priority: str = "low") -> dict:
        """Step 2 for Veo 3.1: Image-to-Video generation using start_image_media_id (0 credit tier)."""
        ratio_map = {
            "9:16": "VIDEO_ASPECT_RATIO_PORTRAIT",
            "16:9": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "1:1": "VIDEO_ASPECT_RATIO_SQUARE"
        }
        endpoint = f"{self.base_url}/api/flow/generate-video"
        payload = {
            "start_image_media_id": image_media_id,
            "prompt": prompt,
            "project_id": project_id or self.project_id,
            "scene_id": "auto_broll",
            "aspect_ratio": ratio_map.get(aspect_ratio, "VIDEO_ASPECT_RATIO_PORTRAIT"),
            "model_family": "veo",
            "duration_s": duration_s,
            "user_paygate_tier": "PAYGATE_TIER_FREE"
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "VVE-07d/1.0"}
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            return {"error": f"HTTP {e.code}: {err_body}"}
        except Exception as e:
            return {"error": str(e)}

    def submit_omni_t2v(self, prompt: str, project_id: str = "",
                         aspect_ratio: str = "9:16", duration_s: int = 6) -> dict:
        """Direct Text-to-Video generation using Gemini Omni Flash."""
        ratio_map = {
            "9:16": "VIDEO_ASPECT_RATIO_PORTRAIT",
            "16:9": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "1:1": "VIDEO_ASPECT_RATIO_SQUARE"
        }
        endpoint = f"{self.base_url}/api/flow/generate-video-omni-text"
        payload = {
            "prompt": prompt,
            "project_id": project_id or self.project_id,
            "aspect_ratio": ratio_map.get(aspect_ratio, "VIDEO_ASPECT_RATIO_PORTRAIT"),
            "duration_s": max(4, min(10, duration_s)),
            "user_paygate_tier": "PAYGATE_TIER_FREE"
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "VVE-07d/1.0"}
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            return {"error": f"HTTP {e.code}: {err_body}"}
        except Exception as e:
            return {"error": str(e)}

    def submit_broll(self, prompt: str, aspect_ratio: str = "9:16", duration_s: int = 8,
                     model: str = "veo3.1", project_id: str = "", priority: str = "low") -> dict:
        """Unified submit: orchestrates 2-step for Veo 3.1 Lite (0 credit) or 1-step for Omni."""
        pid = project_id or self.project_id
        if "omni" in model.lower():
            return self.submit_omni_t2v(prompt=prompt, project_id=pid, aspect_ratio=aspect_ratio, duration_s=duration_s)

        # Veo 3.1 Lite Low Priority (2-step orchestration: T2I -> I2V)
        print("      [Veo Step 1/2] Generating initial anchor frame (0 credit)...")
        img_res = self.generate_image(prompt=prompt, project_id=pid, aspect_ratio=aspect_ratio)
        if img_res.get("error"):
            return {"error": f"Veo Step 1 (Image Gen) failed: {img_res['error']}"}

        media_id = img_res.get("media_id")
        if not media_id:
            return {"error": "Veo Step 1 (Image Gen) returned no mediaId"}

        print(f"      [Veo Step 1/2] Anchor image ready: {media_id[:12]}...")
        print("      [Veo Step 2/2] Submitting Veo 3.1 Lite video generation (0 credit)...")
        return self.submit_veo_i2v(
            image_media_id=media_id,
            prompt=prompt,
            project_id=pid,
            aspect_ratio=aspect_ratio,
            duration_s=duration_s,
            priority=priority
        )

    def submit_t2v(self, prompt: str, aspect_ratio: str = "9:16", duration_s: int = 8,
                   model: str = "veo3.1", project_id: str = "") -> dict:
        """Backward compatibility alias for submit_broll."""
        return self.submit_broll(prompt=prompt, aspect_ratio=aspect_ratio, duration_s=duration_s,
                                 model=model, project_id=project_id)

    def poll_status(self, submit_res: dict, timeout_sec: int = 300, interval_sec: int = 5) -> dict:
        """Poll job status until completed or timed out. Supports both Veo operations and Omni workflows."""
        operations = submit_res.get("operations")
        workflows = submit_res.get("flowkitPolling", {}).get("workflows") or submit_res.get("workflows")

        if not operations and not workflows:
            if submit_res.get("video_url") or submit_res.get("media_url"):
                return {"status": "COMPLETED", "video_url": submit_res.get("video_url") or submit_res.get("media_url")}
            return {"error": f"No operations or workflows returned by FlowKit to poll: {submit_res}"}

        poll_endpoint = f"{self.base_url}/api/flow/check-status"
        payload = {}
        if workflows:
            payload["workflows"] = workflows
            payload["include_encoded_video"] = True
        elif operations:
            clean_ops = []
            for op in operations:
                if isinstance(op, dict):
                    op_name = op.get("operation", {}).get("name") or op.get("name")
                    if op_name:
                        clean_ops.append({"operation": {"name": op_name}})
                    else:
                        clean_ops.append(op)
            payload["operations"] = clean_ops

        start_time = time.time()
        while time.time() - start_time < timeout_sec:
            time.sleep(interval_sec)
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                poll_endpoint,
                data=data,
                headers={"Content-Type": "application/json", "User-Agent": "VVE-07d/1.0"}
            )
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    res = json.loads(resp.read().decode("utf-8"))

                    # 1. Veo operations response: {"operations": [...]}
                    if isinstance(res, dict) and "operations" in res:
                        ops = res.get("operations", [])
                        if ops:
                            first_op = ops[0]
                            st = (first_op.get("status") or "").upper()
                            if st in ("MEDIA_GENERATION_STATUS_SUCCESSFUL", "COMPLETED", "SUCCESS", "DONE"):
                                meta = first_op.get("operation", {}).get("metadata", {}) or first_op.get("metadata", {})
                                vid_info = meta.get("video", {})
                                vurl = (
                                    vid_info.get("fifeUrl")
                                    or vid_info.get("downloadUrl")
                                    or first_op.get("media", {}).get("videoUrl")
                                    or first_op.get("media", {}).get("downloadUrl")
                                )
                                if vurl:
                                    return {"status": "COMPLETED", "video_url": vurl, "data": res}
                            elif st in ("MEDIA_GENERATION_STATUS_FAILED", "FAILED", "ERROR"):
                                complaint = first_op.get("complaint") or first_op.get("error", "Generation failed")
                                return {"status": "FAILED", "error": complaint}

                    # 2. Omni workflows response (list)
                    elif isinstance(res, list):
                        all_done = True
                        for item in res:
                            st = (item.get("status") or "").upper()
                            if st not in ("COMPLETED", "FAILED", "DONE", "ERROR", "SUCCESS"):
                                all_done = False
                                break
                        if all_done:
                            first = res[0] if res else {}
                            if (first.get("status") or "").upper() in ("FAILED", "ERROR"):
                                return {"status": "FAILED", "error": first.get("error", "Generation failed")}
                            vurl = (
                                first.get("video_url")
                                or first.get("media_url")
                                or first.get("download_url")
                                or first.get("encoded_video_url")
                            )
                            return {"status": "COMPLETED", "video_url": vurl, "data": res}

                    # 3. Direct status dict
                    elif isinstance(res, dict):
                        st = res.get("status", "").upper()
                        if st in ("COMPLETED", "SUCCESS", "DONE", "MEDIA_GENERATION_STATUS_SUCCESSFUL"):
                            vurl = res.get("video_url") or res.get("media_url") or res.get("download_url")
                            return {"status": "COMPLETED", "video_url": vurl, "data": res}
                        elif st in ("FAILED", "ERROR", "MEDIA_GENERATION_STATUS_FAILED"):
                            return {"status": "FAILED", "error": res.get("error", "Generation failed")}
            except Exception:
                pass

        return {"error": f"Generation timed out after {timeout_sec}s"}

    def download_video(self, url: str, target_path: Path) -> bool:
        """Download generated video to target file path atomically via .part."""
        target_path.parent.mkdir(parents=True, exist_ok=True)
        part_path = target_path.with_suffix(".part")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "VVE-07d/1.0"})
            with urllib.request.urlopen(req, timeout=60) as resp, open(part_path, "wb") as out_f:
                out_f.write(resp.read())
            if part_path.exists() and part_path.stat().st_size > 0:
                os.replace(str(part_path), str(target_path))
                return True
            else:
                if part_path.exists():
                    part_path.unlink()
                return False
        except Exception as e:
            print(f"   ❌ Download failed: {e}")
            if part_path.exists():
                try:
                    part_path.unlink()
                except Exception:
                    pass
            return False


# ─── L1 QA Engine (Deterministic Python / OpenCV) ───────────────────────────────

class L1QualityAssurance:
    @staticmethod
    def inspect_video(video_path: Path, target_duration: float, min_size_kb: int = 100) -> dict:
        """Run L1 checks: size, corruption, duration, black frames, freezes."""
        result = {
            "passed": False,
            "errors": [],
            "warnings": [],
            "file_size_kb": 0,
            "actual_duration": 0.0,
            "width": 0,
            "height": 0,
            "fps": 0.0,
            "keyframes": []
        }

        if not video_path.exists():
            result["errors"].append("File does not exist")
            return result

        size_kb = video_path.stat().st_size / 1024.0
        result["file_size_kb"] = round(size_kb, 1)
        if size_kb < min_size_kb:
            result["errors"].append(f"File size too small: {size_kb:.1f} KB (min: {min_size_kb} KB)")
            return result

        if not HAS_OPENCV:
            result["warnings"].append("OpenCV not installed; skipping deep frame inspection")
            result["passed"] = (len(result["errors"]) == 0)
            return result

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            result["errors"].append("Cannot open video with OpenCV (corrupted file)")
            return result

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0.0

        result["fps"] = round(fps, 2)
        result["width"] = width
        result["height"] = height
        result["actual_duration"] = round(duration, 2)

        if duration < 1.0:
            result["errors"].append(f"Video too short: {duration:.2f}s")

        # Check duration deviation (warning if > 2.5s difference)
        if target_duration > 0 and abs(duration - target_duration) > 3.0:
            result["warnings"].append(
                f"Duration discrepancy: generated {duration:.1f}s vs target {target_duration:.1f}s"
            )

        # Extract 3 keyframes at 15%, 50%, 85%
        qa_dir = video_path.parent.parent / "intermediates" / "qa_frames"
        qa_dir.mkdir(parents=True, exist_ok=True)
        stem = video_path.stem

        frame_indices = [
            int(total_frames * 0.15),
            int(total_frames * 0.50),
            int(total_frames * 0.85)
        ]

        extracted_frames = []
        is_all_black = True
        previous_frame = None
        is_frozen = True

        for idx, f_pos in enumerate(frame_indices):
            cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, min(total_frames - 1, f_pos)))
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            # Check brightness (black frame check)
            mean_brightness = frame.mean()
            if mean_brightness > 8.0:
                is_all_black = False

            # Check freeze (diff between keyframes)
            if previous_frame is not None:
                diff = cv2.absdiff(frame, previous_frame)
                if diff.mean() > 2.0:
                    is_frozen = False
            previous_frame = frame.copy()

            # Save keyframe
            kf_name = f"{stem}_f{idx + 1}.jpg"
            kf_path = qa_dir / kf_name
            cv2.imwrite(str(kf_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            extracted_frames.append(str(kf_path))

        cap.release()

        if is_all_black:
            result["errors"].append("Detected black/blank video (mean brightness < 8.0)")
        if len(extracted_frames) >= 2 and is_frozen:
            result["errors"].append("Detected static/frozen video across keyframes")

        result["keyframes"] = extracted_frames
        result["passed"] = (len(result["errors"]) == 0)
        return result


# ─── Prompt Parser & Fallback Generator ──────────────────────────────────────────

def resolve_scene_prompt(scene: dict, job_dir: Path) -> str:
    """Find prompt from scene object, scene_table.md, or generate fallback."""
    scene_id = scene.get("id", "S01")

    # 1. Direct field in scene_table.json
    for key in ("video_prompt", "broll_prompt", "prompt", "prompt_t2v"):
        if scene.get(key):
            return clean_prompt_text(scene[key], scene_id)

    # 2. Check broll_prompts.json if present
    prompts_file = job_dir / "broll_prompts.json"
    if prompts_file.exists():
        try:
            with open(prompts_file, "r", encoding="utf-8-sig") as pf:
                data = json.load(pf)
                if isinstance(data, dict) and scene_id in data:
                    return clean_prompt_text(data[scene_id], scene_id)
        except Exception:
            pass

    # 3. Parse scene_table.md (from 07c)
    md_file = job_dir / "scene_table.md"
    if md_file.exists():
        try:
            with open(md_file, "r", encoding="utf-8-sig") as mf:
                content = mf.read()
                # Find lines matching scene_id in table
                for line in content.splitlines():
                    if f"[{scene_id}]" in line or f"`{scene_id}`" in line or line.startswith(f"{scene_id}\t"):
                        parts = [p.strip() for p in re.split(r"[\t|]", line) if p.strip()]
                        if len(parts) >= 4:
                            # Usually the last column is Video Prompt
                            cand = parts[-1]
                            if len(cand) > 15:
                                return clean_prompt_text(cand, scene_id)
        except Exception:
            pass

    # 4. Fallback contextual generation
    sub = scene.get("subtitle_text") or scene.get("subtitle") or "health medical demonstration"
    category = scene.get("emphasis_reason") or "medical education"
    fallback = (
        f"Cinematic photorealistic 8k video representing {sub}, {category}, "
        f"high production value, smooth camera motion, medical aesthetic, 4k quality."
    )
    return fallback


def clean_prompt_text(text: str, scene_id: str) -> str:
    """Strip markdown markers, scene ID tags, and unnecessary quotes."""
    text = text.strip("`'\"\t\n\r ")
    text = re.sub(rf"^\[?{scene_id}\]?:?\s*", "", text)
    text = text.strip("`'\"\t\n\r ")
    return text


def sanitize_filename(name: str) -> str:
    """Create a safe filename string."""
    name = re.sub(r'[\\/*?:"<>|]', "", name)
    name = re.sub(r'\s+', "_", name)
    return name[:35]


# ─── Target Folder Resolution ───────────────────────────────────────────────────

def resolve_target_footage_dir(job_name: str, job_dir: Path, channel_cfg: dict) -> Path:
    """Resolve target folder for B-Roll clips in exact order expected by 08."""
    # 1. Check raw_folder from registry
    reg = load_registry()
    proj_info = reg.get("projects", {}).get(job_name, {})
    raw_folder = proj_info.get("raw_folder")
    if raw_folder and Path(raw_folder).exists():
        target = Path(raw_folder) / "VDO footage"
        target.mkdir(parents=True, exist_ok=True)
        return target

    # 2. Priority path on V: drive
    v_path = Path(r"V:\DoctorBank Family\DoctorBank Brand\Raw Clip") / job_name / "VDO footage"
    if v_path.parent.exists():
        v_path.mkdir(parents=True, exist_ok=True)
        return v_path

    # 3. Local fallback All Raw Clips
    base_vve = SCRIPT_DIR.parent
    local_raw = base_vve / "All Raw Clips" / job_name / "VDO footage"
    if local_raw.parent.exists():
        local_raw.mkdir(parents=True, exist_ok=True)
        return local_raw

    # 4. Inside CapCut project folder Footage
    target = job_dir / "Footage"
    target.mkdir(parents=True, exist_ok=True)
    return target


# ─── Main Orchestrator ──────────────────────────────────────────────────────────

def run_auto_broll_flow(job_input: str, args: argparse.Namespace):
    job_name = job_input
    print("\n" + "=" * 62)
    print("   🎬 07d — AUTO B-ROLL GENERATOR & QA (FlowKit + Veo 3.1)")
    print("=" * 62 + "\n")

    # Load channel config
    config = load_channel_config()
    broll_cfg = config.get("broll", {})

    model = args.model or broll_cfg.get("model", "veo3.1")
    aspect_ratio = args.aspect_ratio or broll_cfg.get("aspect_ratio", "9:16")
    priority = args.priority or broll_cfg.get("priority", "low")
    max_retries = args.max_retries or broll_cfg.get("max_retries", 2)
    backend_url = args.backend_url or broll_cfg.get("backend_url", "http://127.0.0.1:8100")
    flow_project_id = (
        args.project_id
        or broll_cfg.get("flow_project_id")
        or os.environ.get("FLOW_PROJECT_ID", "853a1b94-e647-4a28-b4ea-818053159000")
    )

    # Resolve project path
    try:
        project_dir_str = get_project_path(job_input)
        job_dir = Path(project_dir_str)
    except Exception:
        job_dir = Path(job_input)

    # Resolve target footage directory
    footage_dir = resolve_target_footage_dir(job_name, job_dir, config)
    print(f"📁 Target Footage Dir : {footage_dir}")
    print(f"⚙️  Model Selection   : {model} (Priority: {priority}, 0-credit tier)")
    print(f"🌐 Flow Project UUID  : {flow_project_id}")
    print(f"📐 Aspect Ratio       : {aspect_ratio}")
    print(f"🔁 Max Retries        : {max_retries}")

    # Read scene_table.json
    scene_table_path = job_dir / "scene_table.json"
    if not scene_table_path.exists():
        print(f"❌ Error: scene_table.json not found in {job_dir}. Run 07b first.")
        sys.exit(1)

    with open(scene_table_path, "r", encoding="utf-8-sig") as sf:
        scenes = json.load(sf)

    # Filter B-Roll scenes
    broll_scenes = [
        s for s in scenes
        if "B-Roll" in s.get("visual_type", "") or s.get("visual_type") == "B-Roll (AI Generated)"
    ]

    if args.scenes:
        wanted = [x.strip() for x in args.scenes.split(",") if x.strip()]
        broll_scenes = [s for s in broll_scenes if s.get("id") in wanted]

    print(f"📊 Total Scenes       : {len(scenes)}")
    print(f"🎯 B-Roll Candidates  : {len(broll_scenes)} scenes\n")

    if not broll_scenes:
        print("ℹ️  No B-Roll scenes required. Marking 07d as done.")
        update_step(job_name, "07d", "done")
        return

    # Check FlowKit Server
    client = FlowKitClient(backend_url, project_id=flow_project_id)
    health = client.check_health()

    if not args.dry_run:
        h_status = health.get("status")
        if h_status == "offline":
            print("=" * 62)
            print("⚠️  FLOWKIT SERVER IS OFFLINE (Port 8100 not responding)")
            print("=" * 62)
            print("💡 The automated pipeline requires FlowKit backend to generate videos.")
            print("   How to start FlowKit:")
            print("   1. Run: python \"P:\\AI\\The Viral\\FlowKit\\flow_cli.py\" start")
            print("   2. Ensure Chrome is running with FlowKit Extension logged into flow.google.com")
            print("   3. Or test pipeline logic now with: python 07d-auto-broll-flow.py --dry-run")
            print(f"\n⏸️  Cleanly pausing pipeline at 07d (Exit Code {EXIT_CODE_PAUSE}).")
            update_step(job_name, "07d", "paused")
            sys.exit(EXIT_CODE_PAUSE)
        elif h_status == "extension_disconnected":
            print("=" * 62)
            print("⚠️  CHROME EXTENSION IS NOT CONNECTED")
            print("=" * 62)
            print("💡 FlowKit server is running, but the Chrome extension is disconnected.")
            print("   Please ensure Google Chrome is open with flow.google.com active and FlowKit Extension loaded.")
            print(f"\n⏸️  Cleanly pausing pipeline at 07d (Exit Code {EXIT_CODE_PAUSE}).")
            update_step(job_name, "07d", "paused")
            sys.exit(EXIT_CODE_PAUSE)

    update_step(job_name, "07d", "wip")

    # Execution Loop
    manifest_records = []
    success_count = 0
    fail_count = 0

    intermediates_dir = job_dir / "intermediates"
    intermediates_dir.mkdir(parents=True, exist_ok=True)

    for idx, scene in enumerate(broll_scenes, start=1):
        scene_id = scene.get("id", f"S{idx:02d}")
        duration = float(scene.get("duration", 4.0))
        prompt = resolve_scene_prompt(scene, job_dir)
        safe_tag = sanitize_filename(prompt[:25])
        target_filename = f"[{scene_id}]_{safe_tag}.mp4"
        target_file_path = footage_dir / target_filename

        print(f"──────────────────────────────────────────────────────────────")
        print(f"▶️ [{idx}/{len(broll_scenes)}] Scene {scene_id} ({duration:.1f}s)")
        print(f"   Prompt : {prompt[:80]}...")
        print(f"   Target : {target_filename}")

        # Check existing
        if target_file_path.exists() and not args.force:
            print(f"   ⚡ File already exists. Running QA validation...")
            qa_res = L1QualityAssurance.inspect_video(target_file_path, duration)
            if qa_res["passed"]:
                print(f"   ✅ L1 QA PASSED (Size: {qa_res['file_size_kb']} KB, Dur: {qa_res['actual_duration']}s)")
                manifest_records.append({
                    "scene_id": scene_id,
                    "file_name": target_filename,
                    "file_path": str(target_file_path),
                    "prompt": prompt,
                    "target_duration": duration,
                    "actual_duration": qa_res["actual_duration"],
                    "file_size_kb": qa_res["file_size_kb"],
                    "l1_passed": True,
                    "keyframes": qa_res["keyframes"],
                    "status": "READY_FOR_AGENT_REVIEW"
                })
                success_count += 1
                continue
            else:
                print(f"   ⚠️ Existing file failed L1: {', '.join(qa_res['errors'])}. Regenerating...")

        # Generation with retries
        current_try = 0
        scene_passed = False
        final_qa = {}

        while current_try <= max_retries and not scene_passed:
            current_try += 1
            if current_try > 1:
                print(f"   🔄 Retry attempt {current_try}/{max_retries + 1}...")

            if args.dry_run:
                print(f"   🧪 [DRY-RUN] Simulating FlowKit generation for {scene_id}...")
                time.sleep(1)
                # Create dummy video or placeholder file
                target_file_path.write_text("DUMMY_VIDEO_CONTENT_DRY_RUN", encoding="utf-8")
                scene_passed = True
                final_qa = {
                    "passed": True,
                    "file_size_kb": 10.0,
                    "actual_duration": duration,
                    "keyframes": [],
                    "errors": []
                }
                break

            # Live generation via FlowKit
            print(f"   🚀 Submitting generation to FlowKit ({model}, priority={priority})...")
            submit_res = client.submit_broll(
                prompt=prompt,
                aspect_ratio=aspect_ratio,
                duration_s=int(round(duration)),
                model=model,
                priority=priority
            )

            if submit_res.get("error"):
                print(f"   ❌ FlowKit submission error: {submit_res['error']}")
                continue

            print(f"   ⏳ Waiting for video completion...")
            poll_res = client.poll_status(submit_res, timeout_sec=args.timeout)

            if poll_res.get("error") or poll_res.get("status") != "COMPLETED":
                print(f"   ❌ Generation failed: {poll_res.get('error')}")
                continue

            vurl = poll_res.get("video_url")
            if not vurl:
                print(f"   ❌ No video URL in FlowKit response.")
                continue

            print(f"   📥 Downloading generated footage...")
            download_ok = client.download_video(vurl, target_file_path)
            if not download_ok:
                continue

            # Run L1 QA
            final_qa = L1QualityAssurance.inspect_video(target_file_path, duration)
            if final_qa["passed"]:
                print(f"   ✅ L1 QA PASSED: {final_qa['file_size_kb']} KB, {final_qa['actual_duration']}s, {len(final_qa['keyframes'])} keyframes")
                scene_passed = True
            else:
                print(f"   ⚠️ L1 QA FAILED: {', '.join(final_qa['errors'])}")

        if scene_passed:
            success_count += 1
            manifest_records.append({
                "scene_id": scene_id,
                "file_name": target_filename,
                "file_path": str(target_file_path),
                "prompt": prompt,
                "target_duration": duration,
                "actual_duration": final_qa.get("actual_duration", 0),
                "file_size_kb": final_qa.get("file_size_kb", 0),
                "l1_passed": True,
                "keyframes": final_qa.get("keyframes", []),
                "status": "READY_FOR_AGENT_REVIEW"
            })
        else:
            fail_count += 1
            manifest_records.append({
                "scene_id": scene_id,
                "file_name": target_filename,
                "file_path": str(target_file_path),
                "prompt": prompt,
                "target_duration": duration,
                "l1_passed": False,
                "errors": final_qa.get("errors", ["Failed after retries"]),
                "status": "FAILED"
            })

    # Save Manifest for AG Agent & Step 08
    manifest_path = intermediates_dir / "broll_qa_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump({
            "job_name": job_name,
            "total_broll": len(broll_scenes),
            "passed": success_count,
            "failed": fail_count,
            "aspect_ratio": aspect_ratio,
            "model": model,
            "records": manifest_records
        }, mf, indent=2, ensure_ascii=False)

    print("\n" + "=" * 62)
    print(f"🎉 07d AUTO B-ROLL FINISHED: {success_count} Passed, {fail_count} Failed")
    print(f"📄 QA Manifest saved to: {manifest_path.name}")
    print("=" * 62)

    # Print Keyframe Review Table for Antigravity Agent (Gemini 3.8 Flash)
    print("\n📋 B-ROLL REVIEW MANIFEST FOR ANTIGRAVITY AGENT (L2 VISION JUDGE):")
    for r in manifest_records:
        st_icon = "✅" if r.get("l1_passed") else "❌"
        print(f"  {st_icon} {r['scene_id']} | {r['file_name']} | {r.get('actual_duration', 0)}s")
        kfs = r.get("keyframes", [])
        if kfs:
            rel_kfs = [Path(k).name for k in kfs]
            print(f"     Keyframes: {', '.join(rel_kfs)}")

    insurance_backup(job_input)
    if fail_count > 0:
        print(f"\n⚠️  {fail_count} scenes failed generation. Marking 07d as partial_fail.")
        update_step(job_name, "07d", "partial_fail")
        sys.exit(1)
    elif args.dry_run:
        print("\n🧪 Dry-run completed. Skipping step completion update.")
    else:
        update_step(job_name, "07d", "done")

    # Snapshot
    try:
        draft_path = get_draft_path(job_input)
        save_snapshot(str(job_dir), draft_path, "07d")
    except Exception:
        pass


# ─── CLI Entrypoint ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="07d: Automated B-Roll Generator & QA via FlowKit")
    parser.add_argument("job_dir", nargs="?", help="Project name or job directory")
    parser.add_argument("--model", default=None, help="Video model: veo3.1 (default, 0 credit low priority) or omni_flash")
    parser.add_argument("--aspect-ratio", default=None, choices=["9:16", "16:9", "1:1"], help="Aspect ratio")
    parser.add_argument("--priority", default=None, choices=["low", "standard"], help="Generation priority (low = 0 credit)")
    parser.add_argument("--project-id", default=None, help="Google Flow Project UUID (default: from config or active Flow tab)")
    parser.add_argument("--scenes", default=None, help="Comma-separated scene IDs to process (e.g. S02,S04)")
    parser.add_argument("--dry-run", action="store_true", help="Simulate generation without contacting FlowKit")
    parser.add_argument("--force", action="store_true", help="Force regenerate existing footage")
    parser.add_argument("--max-retries", type=int, default=None, help="Max retries per scene")
    parser.add_argument("--timeout", type=int, default=300, help="Timeout in seconds per clip")
    parser.add_argument("--backend-url", default=None, help="FlowKit backend URL (default: http://127.0.0.1:8100)")

    cli_args = parser.parse_args()

    active_arg = cli_args.job_dir
    if not active_arg:
        active_arg = get_active_project()
        if not active_arg:
            print("❌ Usage: python 07d-auto-broll-flow.py <job_dir_or_project_name>")
            sys.exit(1)
        print(f"📌 Using active project from registry: {active_arg}")

    run_auto_broll_flow(active_arg, cli_args)
