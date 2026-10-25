"""
Синтез звука уведомления: тихий, низкий, мягкий, две ноты.
Звук свой, не копия чужого, поэтому свободен для любого использования.
Запуск: python tools/sound/make_soft.py app/android/app/src/main/res/raw/soft.wav
"""
import math
import struct
import sys
import wave

RATE = 22050
OUT = sys.argv[1] if len(sys.argv) > 1 else 'soft.wav'

# Две ноты вверх: соль малой октавы и си. Низко и спокойно
NOTES = [(196.00, 0.00), (246.94, 0.32)]
LENGTH = 1.9


def tone(freq: float, t: float) -> float:
    # Основной тон и два тихих обертона: звук теплее, чем чистая синусоида
    return (
        math.sin(2 * math.pi * freq * t)
        + 0.35 * math.sin(2 * math.pi * freq * 2 * t)
        + 0.12 * math.sin(2 * math.pi * freq * 3 * t)
    )


def envelope(t: float) -> float:
    attack = 0.03
    if t < 0:
        return 0.0
    if t < attack:
        return t / attack
    return math.exp(-(t - attack) * 3.2)


samples = []
for i in range(int(RATE * LENGTH)):
    t = i / RATE
    v = sum(tone(f, t - start) * envelope(t - start) for f, start in NOTES)
    samples.append(v)

peak = max(abs(s) for s in samples)
gain = 0.45 / peak
# Плавное затухание в самом конце, чтобы не было щелчка
fade = int(RATE * 0.05)
pcm = []
for i, s in enumerate(samples):
    v = s * gain
    if i > len(samples) - fade:
        v *= (len(samples) - i) / fade
    pcm.append(int(max(-1.0, min(1.0, v)) * 32767))

with wave.open(OUT, 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(RATE)
    w.writeframes(b''.join(struct.pack('<h', s) for s in pcm))

print(f'{OUT}: {len(pcm) / RATE:.2f} с, пик {max(abs(s) for s in pcm) / 32767:.2f}')
