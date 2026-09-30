#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ceoupload.py — The CEO Unfiltered Multi-Format Auto-Uploader & Scheduler
========================================================================
Designed specifically for the "The CEO Unfiltered" Facebook Page & VPS Ecosystem.

Modes of Operation:
  1. Article + Image(s) Mode:
     - Direct to Meta Graph API (/photos or /feed)
     - Parses Markdown drafts (removes frontmatter, formats for FB readability)
     - Immediate Publish or Native Meta Scheduling
  2. Video / Reel Mode:
     - Uploads MP4 + Thumbnail to VPS Viral Planner Pro (/api/mc/planner/import)
     - Ingests into Mission Control Dashboard under "The CEO Unfiltered" tab
  3. VPS Queue Mode:
     - Enqueues to VPS SQLite fb_post_queue for automated cron delivery

Usage Examples:
  # 1. Dry-run draft check:
  python scripts/ceoupload.py drafts/EP01_self_help_habits.md --dry-run

  # 2. Publish Article + Image directly to Facebook Page:
  python scripts/ceoupload.py drafts/EP01_self_help_habits.md --image visual.jpg --publish-now

  # 3. Schedule Article + Image on Facebook Page for 19:30 tonight:
  python scripts/ceoupload.py drafts/EP01_self_help_habits.md --image visual.jpg --schedule "2026-10-01 19:30"

  # 4. Upload Video Reel to VPS Viral Planner Pro:
  python scripts/ceoupload.py drafts/EP01_self_help_habits.md --video clip.mp4 --thumb cover.jpg
"""

import os
import sys
import re
import json
import argparse
from datetime import datetime, timezone, timedelta
import requests

# Fix Windows console encoding (CP874)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ─── Configuration & Defaults ───────────────────────────────────────────────
DEFAULT_PAGE_ID = "1362033773652952"
DEFAULT_PAGE_NAME = "The CEO Unfiltered"
DEFAULT_PAGE_TOKEN = (
    os.getenv("CEO_FB_PAGE_TOKEN")
    or "EAAGtgBXMXW4BSmwcwFlUOJwPVcMqLBMxPnRAIPhI2sf17Kj7yWkn6gMLiVp8fYGGp6wu6xkzxQtaHSiGLg8HKm3CGWIYgfNwQLp0qXe8YfZBrtCZBsh7wrh6ZASLC9XZBKq2iVZAwf9Bgc6dT62eu6KYz2ubNxgkSRcq80tBWnZCeDeWpNh9ZBBQ4uJ0YqGMTKaZAb3t4dbL6C2W2AQr3i4kJ5S3"
)

VPS_API_BASE = "https://brain.doctorbankonline.com"
VPS_API_KEY = os.getenv("VPS_API_KEY") or "ZIvyWp4BTqcX2Gm1aDHR7lwz0i8PrVqug5KWBX53wqI"
GRAPH_API_VERSION = "v25.0"


# ─── Draft Markdown Parser ─────────────────────────────────────────────────
def parse_draft_file(draft_path):
    """
    Parses a markdown draft file from drafts/
    Extracts frontmatter metadata and cleans the body for FB posting.
    """
    if not os.path.exists(draft_path):
        raise FileNotFoundError(f"Draft file not found: {draft_path}")

    with open(draft_path, "r", encoding="utf-8") as f:
        raw_text = f.read()

    meta = {}
    body = raw_text

    # Match YAML frontmatter
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw_text, re.DOTALL)
    if fm_match:
        yaml_content = fm_match.group(1)
        body = fm_match.group(2).strip()

        for line in yaml_content.splitlines():
            line = line.strip()
            if ":" in line and not line.startswith("#"):
                key, val = line.split(":", 1)
                meta[key.strip()] = val.strip().strip('"').strip("'")

    # Clean body for Facebook formatting:
    # 1. Convert Markdown headers '# Header' to plain text or clean format
    cleaned_lines = []
    for line in body.splitlines():
        # Remove markdown heading markers (#, ##, ###, ####)
        subbed = re.sub(r"^#{1,6}\s*", "", line)
        cleaned_lines.append(subbed)

    clean_caption = "\n".join(cleaned_lines).strip()

    return {
        "meta": meta,
        "caption": clean_caption,
        "episode": meta.get("episode", ""),
        "title": meta.get("title", ""),
        "pillar": meta.get("pillar", ""),
    }


# ─── Facebook Graph API Helpers ─────────────────────────────────────────────
def check_fb_token(page_token):
    """Verifies that the Page Token is active and valid."""
    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/me"
    try:
        res = requests.get(url, params={"access_token": page_token}, timeout=10)
        data = res.json()
        if "error" in data:
            return False, data["error"].get("message", "Unknown token error")
        return True, data.get("name", "Unknown Page")
    except Exception as e:
        return False, str(e)


def parse_schedule_timestamp(schedule_str):
    """
    Parses a schedule string (e.g., '2026-10-01 19:30') into Unix timestamp (seconds).
    Assumes GMT+7 (Bangkok/Asia) if no timezone is provided.
    """
    schedule_str = schedule_str.strip()
    tz_bkk = timezone(timedelta(hours=7))

    dt = None
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
    ]

    for fmt in formats:
        try:
            naive_dt = datetime.strptime(schedule_str, fmt)
            dt = naive_dt.replace(tzinfo=tz_bkk)
            break
        except ValueError:
            pass

    if not dt:
        raise ValueError(
            f"Invalid schedule format '{schedule_str}'. Use 'YYYY-MM-DD HH:MM' (e.g. '2026-10-01 19:30')"
        )

    now = datetime.now(tz_bkk)
    unix_time = int(dt.timestamp())
    now_unix = int(now.timestamp())

    diff_sec = unix_time - now_unix
    if diff_sec < 600:
        print(f"[WARN] Schedule time is {diff_sec // 60} min from now.")
        print("[WARN] Facebook requires scheduled posts to be at least 10-20 minutes in the future!")

    return unix_time, dt


def post_to_facebook_graph(page_id, page_token, message, image_path=None, schedule_time=None):
    """
    Posts or schedules an Article / Photo to Facebook Page directly via Graph API.
    """
    unix_ts = None
    if schedule_time:
        unix_ts, dt_obj = parse_schedule_timestamp(schedule_time)
        print(f"[*] Scheduling for: {dt_obj.strftime('%Y-%m-%d %H:%M:%S')} GMT+7 (Unix: {unix_ts})")

    # 1. Photo Post
    if image_path and os.path.exists(image_path):
        print(f"[*] Uploading Photo: {image_path}")
        url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{page_id}/photos"
        
        payload = {
            "access_token": page_token,
            "caption": message,
        }

        if unix_ts:
            payload["published"] = "false"
            payload["scheduled_publish_time"] = str(unix_ts)
        else:
            payload["published"] = "true"

        with open(image_path, "rb") as img_file:
            files = {"source": img_file}
            res = requests.post(url, data=payload, files=files, timeout=60)

        data = res.json()
        if "error" in data:
            raise RuntimeError(f"FB Photo Error: {data['error'].get('message')}")
        return data

    # 2. Text-only Post
    else:
        print("[*] Publishing Text / Article Post")
        url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{page_id}/feed"
        payload = {
            "access_token": page_token,
            "message": message,
        }

        if unix_ts:
            payload["published"] = "false"
            payload["scheduled_publish_time"] = str(unix_ts)
        else:
            payload["published"] = "true"

        res = requests.post(url, data=payload, timeout=30)
        data = res.json()
        if "error" in data:
            raise RuntimeError(f"FB Feed Error: {data['error'].get('message')}")
        return data


# ─── VPS Viral Planner Import ───────────────────────────────────────────────
def upload_to_vps_planner(video_path, caption, page_name, story_id="", score="", thumb_path=""):
    """
    Uploads MP4 video + thumbnail to VPS Viral Planner Pro (/api/mc/planner/import)
    Mirrors thanwaupload.py logic.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    url = f"{VPS_API_BASE}/api/mc/planner/import"
    filename = os.path.basename(video_path)

    data = {
        "local_filename": filename,
        "viral_caption": caption,
        "page_name": page_name,
        "publish_status": "queued",
    }
    if story_id:
        data["story_id"] = story_id
    if score:
        data["viral_score"] = score

    files = {
        "video": (filename, open(video_path, "rb"), "video/mp4"),
    }
    if thumb_path and os.path.exists(thumb_path):
        thumb_name = os.path.basename(thumb_path)
        files["thumbnail"] = (thumb_name, open(thumb_path, "rb"), "image/jpeg")

    headers = {
        "Authorization": f"Bearer {VPS_API_KEY}"
    }

    print(f"[*] Uploading video '{filename}' to VPS Viral Planner ({page_name})...")
    res = requests.post(url, data=data, files=files, headers=headers, timeout=180)
    
    if res.status_code in [200, 201]:
        return res.json()
    else:
        raise RuntimeError(f"VPS Upload failed (Status {res.status_code}): {res.text}")


# ─── VPS FB Queue Enqueue ──────────────────────────────────────────────────
def enqueue_to_vps_queue(channel_id, post_type, message, scheduled_at, media_url=None):
    """
    Enqueues a post to VPS /api/fb/queue for cron-fb-graph-post.js execution.
    """
    url = f"{VPS_API_BASE}/api/fb/queue"
    payload = {
        "channel_id": channel_id,
        "post_type": post_type,
        "message": message,
        "scheduled_at": scheduled_at,
        "media_url": media_url,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {VPS_API_KEY}"
    }
    res = requests.post(url, json=payload, headers=headers, timeout=30)
    if res.status_code in [200, 201]:
        return res.json()
    else:
        raise RuntimeError(f"VPS Queue failed (Status {res.status_code}): {res.text}")


# ─── Main CLI ───────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="The CEO Unfiltered: Multi-Format Auto-Uploader & Scheduler (Facebook + VPS)"
    )
    parser.add_argument("draft", nargs="?", help="Path to Markdown draft (e.g. drafts/EP01_self_help_habits.md)")
    parser.add_argument("--caption", "-c", help="Direct text/caption override")
    parser.add_argument("--image", "-i", help="Path to image file (JPG/PNG) for Article+Photo mode")
    parser.add_argument("--video", "-v", help="Path to MP4 video file for Video/Reel mode")
    parser.add_argument("--thumb", "-t", help="Path to thumbnail JPG (for Video mode)")
    parser.add_argument("--schedule", "-s", help="Schedule datetime (e.g. '2026-10-01 19:30')")
    parser.add_argument("--publish-now", action="store_true", help="Publish immediately (no schedule)")
    parser.add_argument("--target", choices=["fb", "vps", "queue"], default=None, help="Target destination (fb=Meta Graph API, vps=Viral Planner Pro, queue=VPS FB Queue)")
    parser.add_argument("--score", default="EXCELLENT", help="Viral Score Tier for video (e.g. SUPREME, EXCELLENT)")
    parser.add_argument("--page", default=DEFAULT_PAGE_NAME, help=f"Target Page Name (Default: '{DEFAULT_PAGE_NAME}')")
    parser.add_argument("--page-id", default=DEFAULT_PAGE_ID, help=f"Target Page ID (Default: '{DEFAULT_PAGE_ID}')")
    parser.add_argument("--token", default=DEFAULT_PAGE_TOKEN, help="Page Access Token override")
    parser.add_argument("--channel-id", type=int, default=13, help="VPS fb_channels ID (Default: 13 for The CEO Unfiltered)")
    parser.add_argument("--dry-run", action="store_true", help="Inspect and validate without sending")
    parser.add_argument("--delete", help="Delete a Facebook post by Post ID")

    args = parser.parse_args()

    # 0. Delete Mode
    if args.delete:
        post_id = args.delete.strip()
        print(f"[*] Deleting Facebook Post: {post_id}...")
        url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{post_id}"
        res = requests.delete(url, params={"access_token": args.token}, timeout=20)
        data = res.json()
        if data.get("success"):
            print(f"🗑️ [SUCCESS] Post {post_id} deleted successfully from Facebook!")
        else:
            print(f"❌ [FAILED] Delete error: {data}")
        return

    # 1. Resolve Caption & Metadata
    caption = args.caption or ""
    story_id = ""
    title = ""

    if args.draft:
        parsed = parse_draft_file(args.draft)
        story_id = parsed["episode"] or ""
        title = parsed["title"] or ""
        if not caption:
            caption = parsed["caption"]

    if not caption:
        print("[ERROR] Please provide a draft file or --caption text!")
        sys.exit(1)

    # 2. Determine Action Mode
    is_video_mode = bool(args.video)
    target = args.target

    if not target:
        target = "vps" if is_video_mode else "fb"

    # 3. Dry-Run Display
    if args.dry_run:
        print("=" * 60)
        print("🔍 [DRY RUN] The CEO Unfiltered — Upload Inspector")
        print("=" * 60)
        print(f"Target Mode  : {target.upper()} ({'Video/Reel' if is_video_mode else 'Article/Photo'})")
        print(f"Page Name    : {args.page}")
        print(f"Page ID      : {args.page_id}")
        if story_id:
            print(f"Episode ID   : {story_id}")
        if title:
            print(f"Title        : {title}")
        if args.image:
            print(f"Image File   : {args.image} (Exists: {os.path.exists(args.image)})")
        if args.video:
            print(f"Video File   : {args.video} (Exists: {os.path.exists(args.video)})")
        if args.thumb:
            print(f"Thumb File   : {args.thumb} (Exists: {os.path.exists(args.thumb)})")
        if args.schedule:
            try:
                unix_ts, dt_obj = parse_schedule_timestamp(args.schedule)
                print(f"Schedule At  : {dt_obj.strftime('%Y-%m-%d %H:%M:%S')} GMT+7 (Unix: {unix_ts})")
            except Exception as e:
                print(f"Schedule At  : [INVALID] {e}")
        else:
            print(f"Publish Mode : {'Immediate (Publish Now)' if args.publish_now else 'Draft / Queued'}")
        
        # Test token preflight
        print("-" * 60)
        print("[*] Testing Page Token Preflight with Graph API...")
        ok, msg = check_fb_token(args.token)
        print(f"Token Status : {'[OK] Valid (' + msg + ')' if ok else '[FAILED] ' + msg}")
        
        print("-" * 60)
        print(f"Caption Length: {len(caption)} characters")
        print("Caption Snippet (First 300 chars):")
        print(caption[:300] + ("..." if len(caption) > 300 else ""))
        print("=" * 60)
        print("✅ Dry Run finished successfully. Remove --dry-run to execute.")
        return

    # 4. Execution Mode: Video Reel -> VPS Viral Planner
    if target == "vps" or is_video_mode:
        if not args.video:
            print("[ERROR] Video mode requires --video <path_to_mp4>")
            sys.exit(1)

        try:
            result = upload_to_vps_planner(
                video_path=args.video,
                caption=caption,
                page_name=args.page,
                story_id=story_id,
                score=args.score,
                thumb_path=args.thumb or ""
            )
            print("=" * 60)
            print(f"🚀 [SUCCESS] Uploaded to VPS Viral Planner Pro!")
            print(f"Job ID       : {result.get('id')}")
            print(f"Page Name    : {result.get('page_name')}")
            print(f"Status       : {result.get('publish_status')}")
            print(f"Dashboard    : {VPS_API_BASE}/#viral-planner")
            print("=" * 60)
        except Exception as e:
            print(f"[FAILED] Error uploading to VPS: {e}")
            sys.exit(1)

    # 5. Execution Mode: Direct to Facebook Page (Meta Graph API)
    elif target == "fb":
        print("[*] Checking Token Preflight...")
        ok, msg = check_fb_token(args.token)
        if not ok:
            print(f"[FAILED] Invalid Page Token: {msg}")
            sys.exit(1)

        print(f"[OK] Token valid for: {msg}")

        # Check schedule or publish-now
        schedule_time = args.schedule
        if not schedule_time and not args.publish_now:
            # Default safety prompt
            print("[INFO] No --schedule or --publish-now specified.")
            print("[INFO] Defaulting to --publish-now. To schedule, pass --schedule 'YYYY-MM-DD HH:MM'")

        try:
            res = post_to_facebook_graph(
                page_id=args.page_id,
                page_token=args.token,
                message=caption,
                image_path=args.image,
                schedule_time=schedule_time
            )
            print("=" * 60)
            if schedule_time:
                print(f"⏰ [SUCCESS] Post scheduled natively on Facebook Page!")
                print(f"Post/Photo ID: {res.get('id') or res.get('post_id')}")
                print(f"Scheduled For: {schedule_time}")
            else:
                print(f"🚀 [SUCCESS] Published live to Facebook Page!")
                print(f"Post/Photo ID: {res.get('id') or res.get('post_id')}")
            print("=" * 60)
        except Exception as e:
            print(f"[FAILED] Error posting to Facebook: {e}")
            sys.exit(1)

    # 6. Execution Mode: VPS Queue
    elif target == "queue":
        if not args.schedule:
            print("[ERROR] Queue mode requires --schedule 'YYYY-MM-DD HH:MM'")
            sys.exit(1)

        post_type = "photo" if args.image else "text"
        try:
            res = enqueue_to_vps_queue(
                channel_id=args.channel_id,
                post_type=post_type,
                message=caption,
                scheduled_at=args.schedule,
                media_url=args.image
            )
            print("=" * 60)
            print(f"📥 [SUCCESS] Enqueued to VPS Post Queue!")
            print(f"Queue ID     : {res.get('id')}")
            print(f"Status       : {res.get('status')}")
            print(f"Scheduled At : {res.get('scheduled_at')}")
            print("=" * 60)
        except Exception as e:
            print(f"[FAILED] Error enqueueing to VPS: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
