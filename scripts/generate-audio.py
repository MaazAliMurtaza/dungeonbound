"""Original lightweight procedural score/effects. No third-party recordings."""
from pathlib import Path
import math
import random
import struct
import wave

DEST = Path(__file__).resolve().parents[1] / 'mobile/assets/audio'
DEST.mkdir(parents=True, exist_ok=True)
RATE = 16000
TAU = math.tau
random.seed(43117)

def frequency(midi): return 440 * 2 ** ((midi - 69) / 12)
def write(name, duration, sample):
    frames = bytearray()
    for i in range(round(duration * RATE)):
        t = i / RATE
        value = max(-0.95, min(0.95, sample(t)))
        frames += struct.pack('<h', round(value * 32767))
    with wave.open(str(DEST / (name + '.wav')), 'wb') as output:
        output.setnchannels(1); output.setsampwidth(2); output.setframerate(RATE); output.writeframes(frames)

def music(name, roots, bar, urgency):
    duration = len(roots) * bar
    def sample(t):
        root = roots[min(len(roots)-1, int(t / bar))]
        local = t % bar
        swell = math.sin(math.pi * local / bar) ** 2
        chord = sum(math.sin(TAU * frequency(root+n) * t) for n in [0,7,12]) * .045 * swell
        beat = bar / 8
        tick = t % beat
        note = [12,19,24,15,19,27,24,19][int(t / beat) % 8]
        pluck = math.sin(TAU * frequency(root+note) * t) * math.exp(-tick * 9) * .12
        bass = math.sin(TAU * frequency(root-12) * t) * .075
        pulse = math.sin(TAU * 55 * tick) * math.exp(-tick * 26) * urgency
        fade = min(1, t/.15, (duration-t)/.15)
        return (chord+pluck+bass+pulse)*fade
    write(name,duration,sample)

music('refuge',[45,41,48,43],6,0)
music('battle',[45,50,52,45],4,.12)
music('guardian',[38,46,48,45],4,.2)
write('slash',.22,lambda t: (random.uniform(-1,1)*.4+math.sin(TAU*(1300*t-2300*t*t))*.18)*math.exp(-t*19))
write('arrow',.25,lambda t: (math.sin(TAU*660*t)*.35+random.uniform(-1,1)*.18)*math.exp(-t*23))
write('spell',.45,lambda t: (math.sin(TAU*(220*t+1000*t*t))*.3+math.sin(TAU*880*t)*.1)*math.exp(-t*8))
write('guard',.28,lambda t: sum(math.sin(TAU*f*t) for f in [610,1013,1537])*.14*math.exp(-t*16))
write('heal',.65,lambda t: sum(math.sin(TAU*frequency(n)*t) for n in [81,84,88])*.1*math.exp(-t*6))
write('ui',.075,lambda t: math.sin(TAU*880*t)*.22*math.exp(-t*65))
write('gold',.32,lambda t: math.sin(TAU*frequency(84 if t<.13 else 91)*t)*.25*math.exp(-(t% .13)*20))
write('victory',1.7,lambda t: math.sin(TAU*frequency([69,72,76,81][min(3,int(t/.25))])*t)*.28*math.exp(-(t%.25)*5)*min(1,(1.7-t)/.35))
write('defeat',1.2,lambda t: math.sin(TAU*frequency([57,53,50,45][min(3,int(t/.25))])*t)*.28*min(1,(1.2-t)/.3))
print('Generated 3 music loops and 9 effects (16 kHz mono PCM).')
