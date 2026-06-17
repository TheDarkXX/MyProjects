import ctranslate2
import traceback
import sys

print("Python version:", sys.version)
print("CTranslate2 version:", ctranslate2.__version__)

try:
    print("Querying CPU compute types...")
    cpu_types = ctranslate2.get_supported_compute_types("cpu")
    print("Supported CPU compute types:", cpu_types)
except Exception as e:
    print("Failed to query CPU compute types:")
    traceback.print_exc()

try:
    print("Querying CUDA compute types...")
    cuda_types = ctranslate2.get_supported_compute_types("cuda")
    print("Supported CUDA compute types:", cuda_types)
except Exception as e:
    print("Failed to query CUDA compute types:")
    traceback.print_exc()
