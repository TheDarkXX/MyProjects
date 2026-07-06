import json

path = r'C:\Users\Admin\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\93.7 สุดยอดอาหารบำรุงไต\draft_content.json'
with open(path, 'r', encoding='utf-8') as f:
    d = json.load(f)

tracks = d.get('tracks', [])
print('Total tracks:', len(tracks))
for t in tracks:
    segs = t.get('segments', [])
    track_type = t.get('type')
    print(f'  Track type={track_type} segments={len(segs)}')
    if segs and track_type in ['text', 'subtitle']:
        first = segs[0]
        print(f'    First seg: start={first.get("target_timerange",{}).get("start")} text_type={first.get("extra_material_refs")}')
