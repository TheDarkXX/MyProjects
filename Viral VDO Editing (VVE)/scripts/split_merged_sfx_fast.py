import os
import subprocess
import wave
import numpy as np

# Paths
INPUT_MP3 = r"V:\DoctorBank Family\DoctorBank Brand\Sound Effect\SFX New.MP3"
TEMP_WAV = r"C:\My Claw\MyProjects\Viral VDO Editing (VVE)\scratch\temp_sfx_new.wav"
OUTPUT_DIR = r"V:\DoctorBank Family\DoctorBank Brand\Sound Effect"

# Target file names in order matching the timeline image exactly
TARGET_NAMES = [
    "sfx_camera_shutter_1.wav",     # Segment 1: Camera Shutter 1
    "sfx_camera_shutter_2.wav",     # Segment 2: Camera Shutter 2
    "sfx_camera_flash.wav",         # Segment 3: Camera Flash
    "sfx_paper_slide.wav",          # Segment 4: Paper Slide
    "sfx_paper_turn.wav",           # Segment 5: Paper Turn
    "sfx_keyboard_typing_long.wav", # Segment 6: Keyboard Type (slowly)
    "sfx_keyboard_typing_slow.wav", # Segment 7: Keyboard Typing 01
    "sfx_keyboard_pc.wav",          # Segment 8: PC keyboard input
    "sfx_click.wav",                # Segment 9: Click
    "sfx_enter.wav",                # Segment 10: Enter
    "sfx_computer_click.wav",       # Segment 11: Computer click
    "sfx_mouse_click.wav"           # Segment 12: Mouse Click
]

def find_ffmpeg():
    base_path = r"C:\Users\Admin\AppData\Local\CapCut\Apps"
    if not os.path.exists(base_path):
        raise FileNotFoundError("CapCut Apps directory not found.")
    
    app_dirs = sorted(os.listdir(base_path))
    for app in reversed(app_dirs):
        ffmpeg_path = os.path.join(base_path, app, "ffmpeg.exe")
        if os.path.exists(ffmpeg_path):
            return ffmpeg_path
    raise FileNotFoundError("ffmpeg.exe not found in CapCut Apps.")

def load_wav(path):
    with wave.open(path, 'rb') as w:
        params = w.getparams()
        n_channels, sampwidth, framerate, n_frames = params[:4]
        raw_data = w.readframes(n_frames)
        
        if sampwidth == 1:
            data = np.frombuffer(raw_data, dtype=np.uint8).astype(np.float32) - 128.0
            max_val = 128.0
        elif sampwidth == 2:
            data = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32)
            max_val = 32768.0
        elif sampwidth == 4:
            data = np.frombuffer(raw_data, dtype=np.int32).astype(np.float32)
            max_val = 2147483648.0
        else:
            raise ValueError(f"Unsupported sample width: {sampwidth}")
            
    if n_channels == 2:
        data = data.reshape(-1, 2)
    return data, max_val, params

def export_wav(path, data, max_val, params):
    n_channels, sampwidth, framerate = params[:3]
    
    # Peak normalize to 0.80
    max_sample = np.max(np.abs(data))
    if max_sample > 0:
        scale = (max_val * 0.80) / max_sample
        data = data * scale
        
    # Clamp and convert back to original dtype
    if sampwidth == 1:
        data_bytes = np.clip(data + 128.0, 0, 255).astype(np.uint8).tobytes()
    elif sampwidth == 2:
        data_bytes = np.clip(data, -32768, 32767).astype(np.int16).tobytes()
    elif sampwidth == 4:
        data_bytes = np.clip(data, -2147483648, 2147483647).astype(np.int32).tobytes()
        
    with wave.open(path, 'wb') as w:
        w.setparams((n_channels, sampwidth, framerate, len(data_bytes) // (n_channels * sampwidth), 'NONE', 'not compressed'))
        w.writeframes(data_bytes)

def fast_split():
    ffmpeg = find_ffmpeg()
    print(f"Using ffmpeg: {ffmpeg}")
    
    # 1. Convert MP3 to WAV
    print("Converting MP3 to WAV...")
    os.makedirs(os.path.dirname(TEMP_WAV), exist_ok=True)
    cmd = [ffmpeg, "-y", "-i", INPUT_MP3, "-acodec", "pcm_s16le", "-ar", "44100", TEMP_WAV]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    print("Conversion done.")
    
    # 2. Load WAV
    data, max_val, params = load_wav(TEMP_WAV)
    n_channels, sampwidth, framerate = params[:3]
    print(f"Loaded WAV: {len(data)} samples, {n_channels} channels, {framerate}Hz")
    
    # Convert to mono envelope for analysis
    if n_channels == 2:
        mono_envelope = np.max(np.abs(data), axis=1) / max_val
    else:
        mono_envelope = np.abs(data) / max_val
        
    # Smooth the envelope using a moving average window to bridge tiny gaps (e.g. 50ms window)
    window_size = int(framerate * 0.05)
    smoothed = np.convolve(mono_envelope, np.ones(window_size)/window_size, mode='same')
    
    # 3. Split using optimal parameters found in search
    # Thresh=0.0150, Gap=0.50s correctly isolates the 12 clean VVE sound effects
    thresh = 0.0150
    gap_seconds = 0.50
    min_gap_samples = int(gap_seconds * framerate)
    
    print(f"Splitting audio using: thresh={thresh:.4f}, gap={gap_seconds:.1f}s...")
    active = smoothed > thresh
    active_idx = np.where(active)[0]
    
    if len(active_idx) == 0:
        print("Error: No active audio regions detected at this threshold!")
        return
        
    best_segments = []
    start = active_idx[0]
    for i in range(1, len(active_idx)):
        if active_idx[i] - active_idx[i-1] > min_gap_samples:
            best_segments.append((start, active_idx[i-1]))
            start = active_idx[i]
    best_segments.append((start, active_idx[-1]))
    
    print(f"Found {len(best_segments)} segments.")
    
    # 4. Export segments
    print("Exporting split files...")
    for i, (start_idx, end_idx) in enumerate(best_segments):
        # Add 100ms padding to start and end
        pad = int(framerate * 0.1)
        start_pad = max(0, start_idx - pad)
        end_pad = min(len(data), end_idx + pad)
        
        seg_data = data[start_pad:end_pad]
        
        # Trim leading/trailing silence inside this segment
        if n_channels == 2:
            seg_env = np.max(np.abs(seg_data), axis=1) / max_val
        else:
            seg_env = np.abs(seg_data) / max_val
            
        indices = np.where(seg_env > 0.005)[0]
        if len(indices) > 0:
            # Keep 20ms padding inside trim
            t_start = max(0, indices[0] - int(framerate * 0.02))
            t_end = min(len(seg_data), indices[-1] + int(framerate * 0.05))
            seg_data = seg_data[t_start:t_end]
            
        if i < len(TARGET_NAMES):
            out_name = TARGET_NAMES[i]
        else:
            out_name = f"sfx_extra_{i+1}.wav"
            
        out_path = os.path.join(OUTPUT_DIR, out_name)
        export_wav(out_path, seg_data, max_val, params)
        print(f"  [OK] Exported {out_name} ({len(seg_data)/framerate:.2f}s)")
        
    # Clean up
    if os.path.exists(TEMP_WAV):
        os.remove(TEMP_WAV)
    print("\n[OK] Done splitting and normalizing merged sounds!")

if __name__ == "__main__":
    fast_split()
