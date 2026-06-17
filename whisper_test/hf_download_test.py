from huggingface_hub import snapshot_download
import traceback
import sys

print("Python version:", sys.version)
try:
    print("Attempting to download 'Systran/faster-whisper-tiny' from Hugging Face Hub...")
    path = snapshot_download("Systran/faster-whisper-tiny")
    print(f"[+] Download successful! Path: {path}")
except Exception as e:
    print("[-] Download failed with exception:")
    traceback.print_exc()
