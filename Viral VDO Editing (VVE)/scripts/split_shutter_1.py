import os
import wave
import numpy as np

# Paths
INPUT_WAV = r"V:\DoctorBank Family\DoctorBank Brand\Sound Effect\sfx_camera_shutter_1.wav"
OUTPUT_DIR = r"V:\DoctorBank Family\DoctorBank Brand\Sound Effect"

def split_shutter():
    if not os.path.exists(INPUT_WAV):
        print(f"Error: {INPUT_WAV} not found.")
        return
        
    print(f"Loading {INPUT_WAV}...")
    with wave.open(INPUT_WAV, 'rb') as w:
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
            
    # Convert to mono envelope for analysis
    if n_channels == 2:
        data_mono = data.reshape(-1, 2)
        mono = np.max(np.abs(data_mono), axis=1) / max_val
    else:
        mono = np.abs(data) / max_val
        
    # Smooth envelope (10ms window)
    window_size = int(framerate * 0.01)
    smoothed = np.convolve(mono, np.ones(window_size)/window_size, mode='same')
    
    # Split with 150ms gap and 0.0150 threshold
    thresh = 0.0150
    gap_seconds = 0.15
    min_gap_samples = int(gap_seconds * framerate)
    
    active = smoothed > thresh
    active_idx = np.where(active)[0]
    
    if len(active_idx) == 0:
        print("Error: No active sound regions found inside the file.")
        return
        
    segs = []
    start = active_idx[0]
    for i in range(1, len(active_idx)):
        if active_idx[i] - active_idx[i-1] > min_gap_samples:
            segs.append((start, active_idx[i-1]))
            start = active_idx[i]
    segs.append((start, active_idx[-1]))
    
    print(f"Found {len(segs)} sub-segments inside sfx_camera_shutter_1.wav.")
    
    if len(segs) != 3:
        print(f"Warning: Expected 3 segments, but found {len(segs)}. We will export all of them.")
        
    suffix = ['a', 'b', 'c', 'd', 'e']
    
    # Export each sub-segment
    for i, (start_idx, end_idx) in enumerate(segs):
        # Add 50ms padding
        pad = int(framerate * 0.05)
        s_pad = max(0, start_idx - pad)
        e_pad = min(len(mono), end_idx + pad)
        
        # Slice data
        if n_channels == 2:
            seg_data = data.reshape(-1, 2)[s_pad:e_pad]
        else:
            seg_data = data[s_pad:e_pad]
            
        # Peak normalize to 0.80
        max_sample = np.max(np.abs(seg_data))
        if max_sample > 0:
            scale = (max_val * 0.80) / max_sample
            seg_data = seg_data * scale
            
        # Clamp and convert back to original bytes
        if sampwidth == 1:
            data_bytes = np.clip(seg_data + 128.0, 0, 255).astype(np.uint8).tobytes()
        elif sampwidth == 2:
            data_bytes = np.clip(seg_data, -32768, 32767).astype(np.int16).tobytes()
        elif sampwidth == 4:
            data_bytes = np.clip(seg_data, -2147483648, 2147483647).astype(np.int32).tobytes()
            
        suf = suffix[i] if i < len(suffix) else str(i+1)
        out_name = f"sfx_camera_shutter_1_{suf}.wav"
        out_path = os.path.join(OUTPUT_DIR, out_name)
        
        with wave.open(out_path, 'wb') as w_out:
            w_out.setparams((n_channels, sampwidth, framerate, len(data_bytes) // (n_channels * sampwidth), 'NONE', 'not compressed'))
            w_out.writeframes(data_bytes)
            
        print(f"  [OK] Exported: {out_name} ({(e_pad-s_pad)/framerate:.2f}s)")
        
    # Delete the original merged file
    try:
        os.remove(INPUT_WAV)
        print(f"🗑️ Deleted original merged file: {os.path.basename(INPUT_WAV)}")
    except Exception as e:
        print(f"Warning: Could not delete original file: {e}")

if __name__ == "__main__":
    split_shutter()
