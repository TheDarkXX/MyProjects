import ctranslate2
import traceback
import sys

print("Python version:", sys.version)
print("CTranslate2 version:", ctranslate2.__version__)

model_path = r"C:\Users\The Dark\.cache\huggingface\hub\models--Systran--faster-whisper-tiny\snapshots\d90ca5fe260221311c53c58e660288d3deb8d356"

try:
    print("Attempting to load Whisper model via ctranslate2.models.Whisper on CPU...")
    model = ctranslate2.models.Whisper(model_path, device="cpu", compute_type="int8")
    print("[+] Successfully loaded Whisper model directly on CPU!")
except Exception as e:
    print("[-] Failed to load Whisper model:")
    traceback.print_exc()
