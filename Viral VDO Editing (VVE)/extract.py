import json
d = json.load(open('C:/Users/Admin/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/Test Auto/transcript.json', encoding='utf-8'))
lines = []
for w in d.get('words', []):
    lines.append(f"[{w.get('start',0):.1f}-{w.get('end',0):.1f}] {w.get('text','')}")
open('transcript_times.txt', 'w', encoding='utf-8').write('\n'.join(lines))
