"""Fix SRT cues where end <= start by redistributing timestamps from the parent word."""
import json
import sys
from pathlib import Path

def fix_grouped_json(grouped_json_path):
    data = json.loads(Path(grouped_json_path).read_text(encoding='utf-8'))
    groups = data.get('groups', [])
    
    fixed_count = 0
    for i, g in enumerate(groups):
        # Fix zero-duration cues: set minimum duration of 0.3s
        if g['end'] <= g['start']:
            # Try to use space before next cue starts
            if i + 1 < len(groups):
                available = groups[i+1]['start'] - g['start']
                g['end'] = g['start'] + min(0.3, max(0.05, available - 0.001))
            else:
                g['end'] = g['start'] + 0.3
            fixed_count += 1
    
    # Re-enforce zero-overlap after fixes
    for i in range(len(groups) - 1):
        if groups[i]['end'] >= groups[i+1]['start']:
            groups[i]['end'] = max(groups[i]['start'] + 0.01, groups[i+1]['start'] - 0.001)
    
    # Remove any cues that are still invalid
    valid_groups = [g for g in groups if g['end'] > g['start']]
    
    data['groups'] = valid_groups
    with open(grouped_json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f'Fixed {fixed_count} zero-duration cues. {len(groups) - len(valid_groups)} removed. {len(valid_groups)} valid cues remain.')

def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    msecs = int(round((seconds - int(seconds)) * 1000))
    if msecs >= 1000:
        msecs = 0
        secs += 1
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{msecs:03d}"

def regenerate_srt(grouped_json_path, srt_path):
    data = json.loads(Path(grouped_json_path).read_text(encoding='utf-8'))
    groups = data.get('groups', [])
    with open(srt_path, 'w', encoding='utf-8') as f:
        for i, group in enumerate(groups, start=1):
            f.write(f"{i}\n")
            f.write(f"{format_time(group['start'])} --> {format_time(group['end'])}\n")
            f.write(f"{group['text']}\n\n")
    print(f'SRT regenerated with {len(groups)} cues -> {srt_path}')

if __name__ == '__main__':
    grouped_json = r'V:\DoctorBank Family\DR.POW\93.7 สุดยอดอาหารบำรุงไต\video_20250929_145057.transcript.grouped.json'
    srt_out = r'V:\DoctorBank Family\DR.POW\93.7 สุดยอดอาหารบำรุงไต\video_20250929_145057.transcript.srt'
    
    fix_grouped_json(grouped_json)
    regenerate_srt(grouped_json, srt_out)
