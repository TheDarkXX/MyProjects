import wave, struct, math

def create_dummy_wav(filename, duration_sec=2, sample_rate=44100):
    num_samples = duration_sec * sample_rate
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        for i in range(num_samples):
            value = int(32767.0 * math.sin(2.0 * math.pi * 440.0 * i / sample_rate))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

if __name__ == '__main__':
    create_dummy_wav('test.wav')
    print('Created test.wav')
