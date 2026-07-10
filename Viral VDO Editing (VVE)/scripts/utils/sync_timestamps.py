import json
import sys
from pathlib import Path

def load_timebolt_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_transcript(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def map_time(raw_time, tb_segments):
    """Maps a timestamp from raw audio to the cut timeline."""
    t_mapped = 0.0
    t_raw_current = 0.0
    
    for seg in tb_segments:
        seg_dur = seg['duration']
        # If the target time falls within this segment
        if t_raw_current <= raw_time < t_raw_current + seg_dur:
            if seg.get('operation') == 'keep':
                return t_mapped + (raw_time - t_raw_current)
            else:
                # Time falls in a removed section. Clamp to the start of the next keep section
                return t_mapped
        
        # Advance counters
        if seg.get('operation') == 'keep':
            t_mapped += seg_dur
        t_raw_current += seg_dur
        
    return t_mapped # Fallback

def sync_transcript(tb_json_path, transcript_path, out_path):
    tb_segments = load_timebolt_json(tb_json_path)
    data = load_transcript(transcript_path)
    groups = data.get('groups', [])
    
    synced_groups = []
    removed_count = 0
    
    for g in groups:
        raw_start = g['start']
        raw_end = g['end']
        
        # Check if the entire subtitle falls inside a removed segment
        is_completely_removed = False
        t_raw_current = 0.0
        for seg in tb_segments:
            seg_start = t_raw_current
            seg_end = t_raw_current + seg['duration']
            
            # If the subtitle is entirely within a removed segment
            if seg.get('operation') == 'remove' and raw_start >= seg_start and raw_end <= seg_end:
                is_completely_removed = True
                break
                
            t_raw_current += seg['duration']
            
        if is_completely_removed:
            removed_count += 1
            continue
            
        mapped_start = map_time(raw_start, tb_segments)
        mapped_end = map_time(raw_end, tb_segments)
        
        # If mapping caused duration to become 0 or negative (e.g., end time clamped to start time)
        if mapped_end <= mapped_start:
            mapped_end = mapped_start + 0.3 # Give it a minimum duration
            
        synced_groups.append({
            'start': round(mapped_start, 3),
            'end': round(mapped_end, 3),
            'text': g['text']
        })
        
    # Enforce zero-overlap on the mapped timeline
    for i in range(len(synced_groups) - 1):
        if synced_groups[i]['end'] >= synced_groups[i+1]['start']:
            synced_groups[i]['end'] = max(synced_groups[i]['start'] + 0.01, synced_groups[i+1]['start'] - 0.001)
            
    data['groups'] = synced_groups
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"Mapped timestamps using Timebolt JSON.")
    print(f"Original cues: {len(groups)}")
    print(f"Removed (fell in silent cuts): {removed_count}")
    print(f"Synced cues: {len(synced_groups)}")
    print(f"Saved mapped JSON to: {out_path}")

if __name__ == '__main__':
    tb_json = r"V:\DoctorBank Family\DR.POW\93.7 สุดยอดอาหารบำรุงไต\video_20250929_145057.mp4.json"
    raw_transcript = r"V:\DoctorBank Family\DR.POW\93.7 สุดยอดอาหารบำรุงไต\video_20250929_145057.transcript.grouped.json"
    mapped_transcript = r"V:\DoctorBank Family\DR.POW\93.7 สุดยอดอาหารบำรุงไต\video_20250929_145057.transcript.mapped.json"
    
    sync_transcript(tb_json, raw_transcript, mapped_transcript)
