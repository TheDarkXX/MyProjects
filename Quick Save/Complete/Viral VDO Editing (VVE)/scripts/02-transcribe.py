import json
import os
import subprocess
import sys
import tempfile
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict

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
        
        if wtype == "spacing" or text.isspace():
            if cur_text:
                merged.append({"text": cur_text, "start": cur_start or 0, "end": cur_end})
                cur_text = ""
                cur_start = None
                cur_end = 0.0
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
    if len(sys.argv) < 2:
        print("Usage: python transcribe_elevenlabs.py <video_or_audio_file>")
        sys.exit(1)
        
    input_file = sys.argv[1]
    
    with tempfile.TemporaryDirectory() as tmp:
        ext = Path(input_file).suffix.lower()
        if ext in {".mp4", ".mov", ".mkv", ".webm"}:
            audio_path = os.path.join(tmp, "audio.wav")
            print("Extracting audio for transcription...")
            extract_audio(input_file, audio_path)
        else:
            audio_path = input_file
            
        print("Sending to ElevenLabs API...")
        result = transcribe_elevenlabs(audio_path)
        
    out_path = str(Path(input_file).with_suffix("")) + ".transcript.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print(f"Success! Raw transcript saved to {out_path}")
