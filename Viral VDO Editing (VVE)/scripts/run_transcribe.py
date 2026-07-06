import json, os, sys, urllib.request, urllib.error
from pathlib import Path

audio_path = r'V:\DoctorBank Family\DR.POW\93.7 สุดยอดอาหารบำรุงไต\video_20250929_145057.cut_audio_16k.wav'

env_path = Path(r'C:\My Claw\MyProjects\Quick Save\Complete\VVE\env\.env')
api_key = None
for line in env_path.read_text(encoding='utf-8').splitlines():
    if line.startswith('ELEVENLABS_API_KEY='):
        api_key = line.split('=', 1)[1].strip()
        break

if not api_key:
    sys.exit(1)

boundary = '----HFBoundary' + os.urandom(8).hex()
body = bytearray()
# REQUEST CHARACTER GRANULARITY
fields = {'model_id': 'scribe_v2', 'timestamps_granularity': 'character', 'language_code': 'tha'}
for k, v in fields.items():
    body.extend(f'--{boundary}\r\n'.encode())
    body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode())
    body.extend(f'{v}\r\n'.encode())
fname = os.path.basename(audio_path)
body.extend(f'--{boundary}\r\n'.encode())
body.extend(f'Content-Disposition: form-data; name="file"; filename="{fname}"\r\n'.encode())
body.extend(f'Content-Type: audio/wav\r\n\r\n'.encode())
with open(audio_path, 'rb') as f:
    body.extend(f.read())
body.extend(f'\r\n--{boundary}--\r\n'.encode())

headers = {
    'xi-api-key': api_key,
    'Content-Type': f'multipart/form-data; boundary={boundary}'
}
req = urllib.request.Request('https://api.elevenlabs.io/v1/speech-to-text', data=bytes(body), headers=headers, method='POST')
try:
    with urllib.request.urlopen(req, timeout=600) as resp:
        raw_data = resp.read()
    data = json.loads(raw_data)
    
    # Extract EXACT character timings from the API response
    raw_words = data.get('words', []) or []
    exact_chars = []
    
    for w in raw_words:
        w_chars = w.get('characters', [])
        for c in w_chars:
            if c.get('text') and not c['text'].isspace():
                exact_chars.append({
                    'text': c['text'],
                    'start': c['start'],
                    'end': c['end']
                })
    
    # We save this as "words" so 03-word-segment.py parses it as before
    # but now each entry is a single true character!
    result = {'text': data.get('text', ''), 'words': exact_chars}
    out_path = r'V:\DoctorBank Family\DR.POW\93.7 สุดยอดอาหารบำรุงไต\video_20250929_145057.transcript.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f'Transcript saved! Extracted {len(exact_chars)} exact characters.')
except Exception as e:
    print(f'Error: {e}')
    sys.exit(1)
