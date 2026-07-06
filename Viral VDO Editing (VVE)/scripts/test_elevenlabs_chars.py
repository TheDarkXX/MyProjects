import json, os, sys, urllib.request, urllib.error
from pathlib import Path

# Use a small file to test, or the cut audio we already have
audio_path = r'V:\DoctorBank Family\DR.POW\93.7 สุดยอดอาหารบำรุงไต\video_20250929_145057.cut_audio_16k.wav'

env_path = Path(r'C:\My Claw\MyProjects\Quick Save\Complete\VVE\env\.env')
api_key = None
for line in env_path.read_text(encoding='utf-8').splitlines():
    if line.startswith('ELEVENLABS_API_KEY='):
        api_key = line.split('=', 1)[1].strip()
        break

print('Testing ElevenLabs Scribe v2 with character granularity...')

boundary = '----HFBoundary' + os.urandom(8).hex()
body = bytearray()
# TEST: change timestamps_granularity to 'character'
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
    
    chars = data.get('characters', [])
    words = data.get('words', [])
    print(f"Returned words length: {len(words)}")
    print(f"Returned characters length: {len(chars)}")
    
    if chars:
        print("First 5 characters:")
        for c in chars[:5]:
            print(f"  {c}")
    elif words:
        print("First 5 words:")
        for w in words[:5]:
            print(f"  {w}")
            
except urllib.error.HTTPError as e:
    msg = e.read().decode('utf-8', errors='replace')
    print(f'HTTP Error {e.code}: {msg}')
