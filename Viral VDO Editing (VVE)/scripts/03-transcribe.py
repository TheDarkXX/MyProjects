import json
import os
import subprocess
import sys
import tempfile
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict

try:
    from dotenv import load_dotenv
    # Load .env from VVE root (one level up from scripts directory)
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    load_dotenv(env_path)
except ImportError:
    pass


def extract_audio(video_path: str, output_path: str) -> None:
    """Extract a 16k mono wav suitable for ElevenLabs API."""
    # Simplified extraction
    subprocess.run(
        ["ffmpeg", "-i", video_path, "-vn", "-ac", "1", "-ar", "16000",
         "-c:a", "pcm_s16le", "-y", output_path],
        capture_output=True, check=True,
    )

def multipart_post(url: str, headers: Dict[str, str], fields: Dict[str, str], file_path: str, file_field: str = "file") -> bytes:
    """POST multipart/form-data without requests/form-data. Stdlib only."""
    boundary = "----HFBoundary" + os.urandom(8).hex()
    body = bytearray()
    for k, v in fields.items():
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode())
        body.extend(f"{v}\r\n".encode())
    fname = os.path.basename(file_path)
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(f'Content-Disposition: form-data; name="{file_field}"; filename="{fname}"\r\n'.encode())
    body.extend(f"Content-Type: audio/wav\r\n\r\n".encode())
    with open(file_path, "rb") as f:
        body.extend(f.read())
    body.extend(f"\r\n--{boundary}--\r\n".encode())

    req_headers = dict(headers)
    req_headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    req = urllib.request.Request(url, data=bytes(body), headers=req_headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {msg}") from e

def transcribe_elevenlabs(audio_path: str) -> Dict:
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        # Check .env file fallback
        env_path = Path(__file__).parent.parent / "env" / ".env"
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if line.startswith("ELEVENLABS_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break
        if not api_key:
            raise RuntimeError("ELEVENLABS_API_KEY not set in environment or .env file")

    fields = {"model_id": "scribe_v2", "timestamps_granularity": "word", "language_code": "tha"}
    raw = multipart_post(
        "https://api.elevenlabs.io/v1/speech-to-text",
        {"xi-api-key": api_key},
        fields, audio_path,
    )
    data = json.loads(raw)
    
    # Merge spacing nodes so we have true characters
    raw_words = data.get("words", []) or []
    merged = []
    cur_text = ""
    cur_start = None
    cur_end = 0.0
    for w in raw_words:
        wtype = w.get("type", "word")
        text = w.get("text", "")
        start = float(w.get("start", 0))
        end = float(w.get("end", start))
        
        if wtype == "spacing" or text.isspace() or (cur_start is not None and (end - cur_start > 0.4 or len(cur_text) >= 4)):
            if cur_text:
                merged.append({"text": cur_text, "start": cur_start or 0, "end": cur_end})
                cur_text = ""
                cur_start = None
                cur_end = 0.0
            if wtype == "spacing" or text.isspace():
                continue
            
        if cur_start is None:
            cur_start = start
        cur_text += text
        cur_end = end
        
    if cur_text:
        merged.append({"text": cur_text, "start": cur_start or 0, "end": cur_end})
        
    return {
        "text": data.get("text", ""),
        "words": merged, # Now character-level list
    }

if __name__ == "__main__":
    # Add utils to path so we can import capcut_utils
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
    try:
        from capcut_utils import get_project_path
        from registry import get_active_project, update_step
    except ImportError:
        print("❌ Error: Could not import utils modules. Run from scripts directory.")
        sys.exit(1)
        
    if len(sys.argv) >= 2:
        project_input = sys.argv[1]
    else:
        project_input = get_active_project()
        if not project_input:
            print("Usage: python 03-transcribe.py <capcut_project_name_or_path>")
            sys.exit(1)
        print(f"📌 Using active project: {project_input}")
        
    update_step(project_input, "03", "wip")
        
    try:
        project_dir = get_project_path(project_input)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
        
    input_file = os.path.join(project_dir, "cut_audio_16k.wav")
    
    if not os.path.exists(input_file):
        print(f"❌ Error: {input_file} not found.")
        print(f"   Please run 02-extract-audio.py first.")
        sys.exit(1)
    
    with tempfile.TemporaryDirectory() as tmp:
        audio_path = input_file
        
        # Calculate duration and cost
        import wave
        with wave.open(audio_path, 'rb') as w:
            frames = w.getnframes()
            rate = w.getframerate()
            duration_sec = frames / float(rate)
            
        usd_per_hour = 0.22  # ElevenLabs Scribe pricing (Standard)
        usd_cost = (duration_sec / 3600.0) * usd_per_hour
        thb_cost = usd_cost * 35.0  # Approx exchange rate
        
        print(f"▶️ Sending {input_file} to ElevenLabs API...")
        print(f"   Audio length: {duration_sec/60:.2f} min")
        print(f"   Estimated API Cost: ${usd_cost:.4f} (~{thb_cost:.2f} THB)")
        
        result = transcribe_elevenlabs(audio_path)
        
    out_path = os.path.join(project_dir, "transcript.json")
    
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Success! Raw transcript saved to {out_path}")
    
    # Check duration mismatch
    from capcut_utils import load_draft
    draft = load_draft(project_input)
    capcut_dur = draft.get('duration', 0) / 1000000.0
    diff = abs(duration_sec - capcut_dur)
    
    print(f"\n🔬 Timeline Alignment Check:")
    print(f"   CapCut Timeline: {capcut_dur:.2f}s")
    print(f"   Audio Extracted: {duration_sec:.2f}s")
    if diff > 5.0:
        print(f"   ❌ MISMATCH DETECTED (Δ = {diff:.1f}s)!")
        print(f"      The audio length does NOT match the CapCut timeline.")
        print(f"      This usually means `02-extract-audio` was run at the wrong time")
        print(f"      or the video was reverted without re-running 02.")
    else:
        print(f"   ✅ PERFECT MATCH: Audio perfectly aligns with timeline!")

    print(f"\n📊 Usage Report:")
    print(f"   - Audio Duration: {duration_sec:.1f} seconds")
    print(f"   - ElevenLabs Scribe Rate: $0.22 / hour")
    print(f"   - Cost for this run: {thb_cost:.2f} บาท")
    
    update_step(project_input, "03", "wip")


    update_step(project_input, '03', 'done')
    from utils.backup import insurance_backup
    insurance_backup(project_input)
