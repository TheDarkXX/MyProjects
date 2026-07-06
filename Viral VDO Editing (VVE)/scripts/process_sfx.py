import os
import glob
import subprocess
import wave
import numpy as np

# Configuration
SOURCE_DIRS = [
    r"V:\DoctorBank Family\DR.Bank Short Clip\Sound คัด",
    r"V:\DoctorBank Family\DR.Bank Short Clip\Sound คัด\Swoosh",
    r"V:\DoctorBank Family\DR.Bank Short Clip\Sound คัด\ตบมุก",
    r"V:\DoctorBank Family\DR.Bank Short Clip\Sound คัด\แป่ว"
]
DEST_DIR = r"V:\DoctorBank Family\DoctorBank Brand\Sound Effect"
TEMP_DIR = r"C:\My Claw\MyProjects\Viral VDO Editing (VVE)\scratch\temp_sfx"

# Specific Mapping to VVE Standard SFX Names (Best matches from filenames)
SFX_MAPPING = {
    # Key = lower case substring of original filename, Value = target standard name
    "ding": "sfx_ding.wav",
    "เปิดติ๊งงง": "sfx_ding.wav",
    "pop": "sfx_pop.wav",
    "digital whoosh 04": "sfx_whoosh.wav",
    "bigsmsh": "sfx_deep_swoosh.wav",
    "hiscale": "sfx_glitch.wav",
    "record scratch": "sfx_scratch.wav",
    "right": "sfx_correct.wav",
    "buzzer": "sfx_buzzer.wav",
    "oh no": "sfx_ohno.wav",
    "huh": "sfx_huh.wav",
    "effect idea": "sfx_idea.wav",
    "wow": "sfx_wow.wav",
    "ตกใจ": "sfx_shock.wav",
}

def find_ffmpeg():
    # Find the latest CapCut app directory containing ffmpeg.exe
    base_path = r"C:\Users\Admin\AppData\Local\CapCut\Apps"
    if not os.path.exists(base_path):
        raise FileNotFoundError("CapCut Apps directory not found.")
    
    app_dirs = sorted(os.listdir(base_path))
    for app in reversed(app_dirs):
        ffmpeg_path = os.path.join(base_path, app, "ffmpeg.exe")
        if os.path.exists(ffmpeg_path):
            return ffmpeg_path
            
    raise FileNotFoundError("ffmpeg.exe not found in CapCut Apps.")

def trim_silence_numpy(wav_path, out_path, threshold=0.01):
    """Trims leading and trailing silence from a WAV file using numpy."""
    with wave.open(wav_path, 'rb') as w:
        params = w.getparams()
        n_channels, sampwidth, framerate, n_frames = params[:4]
        
        # Read raw frames
        raw_data = w.readframes(n_frames)
        
        # Convert to numpy array based on sample width
        if sampwidth == 1:
            data = np.frombuffer(raw_data, dtype=np.uint8) - 128
        elif sampwidth == 2:
            data = np.frombuffer(raw_data, dtype=np.int16)
        elif sampwidth == 4:
            data = np.frombuffer(raw_data, dtype=np.int32)
        else:
            raise ValueError(f"Unsupported sample width: {sampwidth}")
            
    # Reshape if stereo
    if n_channels == 2:
        data = data.reshape(-1, 2)
        # Use maximum amplitude of both channels for thresholding
        amplitude = np.max(np.abs(data), axis=1)
    else:
        amplitude = np.abs(data)
        
    # Find maximum amplitude to scale threshold
    max_val = np.max(amplitude)
    if max_val == 0:
        # File is silent, just copy it
        shutil.copy2(wav_path, out_path)
        return
        
    abs_threshold = max_val * threshold
    
    # Find start and end indices
    indices = np.where(amplitude > abs_threshold)[0]
    if len(indices) == 0:
        start_idx, end_idx = 0, len(amplitude)
    else:
        start_idx = max(0, indices[0] - int(framerate * 0.02)) # Keep 20ms padding
        end_idx = min(len(amplitude), indices[-1] + int(framerate * 0.05)) # Keep 50ms padding
        
    # Slice the original data
    trimmed_data = data[start_idx:end_idx]
    
    # Normalize peak volume to a consistent target (e.g. -2 dBFS / 80% peak amplitude)
    target_peak = 0.80
    max_sample = np.max(np.abs(trimmed_data))
    if max_sample > 0:
        if sampwidth == 1:
            # 8-bit unsigned
            scale = (127 * target_peak) / max_sample
            # Since data was shifted by subtracting 128, trimmed_data is signed here
            normalized_data = (trimmed_data * scale).astype(np.float32)
            # Re-offset to uint8
            trimmed_data = np.clip(normalized_data + 128, 0, 255).astype(np.uint8)
        elif sampwidth == 2:
            # 16-bit signed
            scale = (32767 * target_peak) / max_sample
            normalized_data = (trimmed_data * scale).astype(np.float32)
            trimmed_data = np.clip(normalized_data, -32768, 32767).astype(np.int16)
        elif sampwidth == 4:
            # 32-bit signed
            scale = (2147483647 * target_peak) / max_sample
            normalized_data = (trimmed_data * scale).astype(np.float32)
            trimmed_data = np.clip(normalized_data, -2147483648, 2147483647).astype(np.int32)

    # Flatten back if stereo
    if n_channels == 2:
        trimmed_data = trimmed_data.flatten()
        
    # Write trimmed data
    with wave.open(out_path, 'wb') as w_out:
        w_out.setparams((n_channels, sampwidth, framerate, len(trimmed_data) // n_channels, params[4], params[5]))
        w_out.writeframes(trimmed_data.tobytes())

import re

def clean_filename(filename):
    # Keep Thai characters (including vowels and tone marks), English letters, numbers, hyphens, and underscores
    base = os.path.splitext(filename)[0]
    clean = re.sub(r'[^\u0e00-\u0e7fA-Za-z0-9\-\_]', '_', base)
    clean = re.sub(r'_+', '_', clean).strip('_')
    return clean + ".wav"

def process_sounds():
    ffmpeg = find_ffmpeg()
    print(f"Using ffmpeg from CapCut: {ffmpeg}")
    
    os.makedirs(DEST_DIR, exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)
    
    processed_count = 0
    
    for src_dir in SOURCE_DIRS:
        if not os.path.exists(src_dir):
            print(f"Source directory {src_dir} does not exist. Skipping.")
            continue
            
        print(f"\nScanning directory: {src_dir}")
        for file_path in glob.glob(os.path.join(src_dir, "*.*")):
            if os.path.isdir(file_path):
                continue
                
            filename = os.path.basename(file_path)
            ext = os.path.splitext(filename)[1].lower()
            
            if ext not in ['.wav', '.mp3', '.wma']:
                continue
                
            print(f"Processing: {filename}")
            
            # Temporary WAV file path
            temp_wav = os.path.join(TEMP_DIR, "temp.wav")
            if os.path.exists(temp_wav):
                os.remove(temp_wav)
                
            # Convert to WAV with ffmpeg (force 16-bit, 44.1kHz stereo/mono)
            cmd = [ffmpeg, "-y", "-i", file_path, "-acodec", "pcm_s16le", "-ar", "44100", temp_wav]
            try:
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            except subprocess.CalledProcessError:
                print(f"  ❌ FFMPEG conversion failed for {filename}")
                continue
                
            # Determine Output Filename
            lower_name = filename.lower()
            target_name = None
            
            for key, val in SFX_MAPPING.items():
                if key in lower_name:
                    target_name = val
                    break
                    
            if not target_name:
                target_name = clean_filename(filename)
                
            dest_file_path = os.path.join(DEST_DIR, target_name)
            
            # Trim silence and save to destination
            try:
                trim_silence_numpy(temp_wav, dest_file_path, threshold=0.01)
                print(f"  [OK] Saved: {target_name} (Trimmed)")
                processed_count += 1
            except Exception as e:
                print(f"  [ERROR] Silence trimming failed for {filename}: {e}")
                # Fallback: copy untrimmed temp_wav
                import shutil
                shutil.copy2(temp_wav, dest_file_path)
                print(f"  [WARN] Saved: {target_name} (Untrimmed fallback)")
                processed_count += 1
                
    # Clean up temp
    if os.path.exists(TEMP_DIR):
        import shutil
        shutil.rmtree(TEMP_DIR)
        
    print(f"\n[OK] Successfully processed and trimmed {processed_count} sound effects!")
    print(f"Destination: {DEST_DIR}")

if __name__ == "__main__":
    process_sounds()
