import whisper, os, time, sys

FFMPEG_BIN = r"C:\Users\Admin\ffmpeg\bin"
os.environ["PATH"] = FFMPEG_BIN + ";" + os.environ.get("PATH", "")

VDO_DIR = r"c:\My Claw\MyProjects\DoctorBank-Band\Products\Magnesium-Night-Plus\Raw-Data\Raw VDO"
OUT_DIR = r"c:\My Claw\MyProjects\DoctorBank-Band\Products\Magnesium-Night-Plus\Raw-Data\Transcripts"
os.makedirs(OUT_DIR, exist_ok=True)

FILES = ["live1.mp4", "live2.mp4", "Live3.mp4", "Live4.mp4"]

print("Loading Whisper medium model...")
model = whisper.load_model("medium")
print("Model loaded!")

for file in FILES:
    fpath = os.path.join(VDO_DIR, file)
    if not os.path.exists(fpath):
        print(f"SKIP: {file} not found")
        continue

    print(f"\n{'='*60}")
    print(f"Transcribing: {file}")
    print(f"{'='*60}")
    t0 = time.time()

    result = model.transcribe(fpath, language="th", verbose=False)

    elapsed = time.time() - t0
    seg_count = len(result["segments"])
    print(f"Done in {elapsed:.0f}s | Segments: {seg_count}")

    # Save transcript
    outf = os.path.join(OUT_DIR, file.replace(".mp4", "_transcript.txt"))
    with open(outf, "w", encoding="utf-8") as f:
        for seg in result["segments"]:
            start = seg["start"]
            end = seg["end"]
            text = seg["text"].strip()
            mm_s, ss_s = divmod(int(start), 60)
            mm_e, ss_e = divmod(int(end), 60)
            f.write(f"[{mm_s:02d}:{ss_s:02d}-{mm_e:02d}:{ss_e:02d}] {text}\n")

    print(f"Saved: {outf}")

    # Show first 5 segments
    print("First 5 segments:")
    for seg in result["segments"][:5]:
        s = seg["start"]
        e = seg["end"]
        t = seg["text"].strip()
        print(f"  [{s:.1f}-{e:.1f}] {t}")

print(f"\n{'='*60}")
print("ALL DONE!")
print(f"{'='*60}")
