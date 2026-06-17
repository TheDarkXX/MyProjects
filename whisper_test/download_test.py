import traceback
import sys

print("Python:", sys.version)

try:
    from faster_whisper import WhisperModel
    print("faster_whisper imported successfully.")
except Exception as e:
    print("Failed to import faster_whisper:")
    traceback.print_exc()
    sys.exit(1)

try:
    print("Attempting to initialize 'tiny' model on CPU to verify downloading works...")
    model = WhisperModel("tiny", device="cpu", compute_type="int8")
    print("[+] Successfully loaded 'tiny' model on CPU!")
except Exception as e:
    print("[-] Failed to initialize model:")
    traceback.print_exc()
