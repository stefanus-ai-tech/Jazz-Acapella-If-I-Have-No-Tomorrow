# Song analysis -> public/analysis.json (loudness, onsets, beats, melody, chords, key, lyric timing)
# numpy + ffmpeg only. Lyric timing comes from scripts/whisper_words.json (see transcribe.py).
# Chords/sections/key are never displayed; they only drive colour and intensity in the video.
import json, re, subprocess, difflib
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MP3 = ROOT / 'v5 If I Have No Tomorrow acapella jazz.mp3'
OUT = HERE.parent / 'public' / 'analysis.json'
SR, FPS = 22050, 30
HOP = SR // FPS  # 735 samples = one video frame
NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(MP3), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
y = np.frombuffer(raw, np.float32).copy()
duration = len(y) / SR
nF = int(np.ceil(len(y) / HOP))


def framed(n_fft, hop, n):
    pad = np.pad(y, (n_fft // 2, n_fft // 2 + hop))
    return pad[np.arange(n_fft)[None, :] + hop * np.arange(n)[:, None]]


def smooth(x, w):
    w = max(1, int(w))
    return np.convolve(np.pad(x, (w // 2, w - 1 - w // 2), mode='edge'), np.ones(w) / w, mode='valid')


def norm01(x, lo_pct=5, hi_pct=99.5):
    lo, hi = np.percentile(x, lo_pct), np.percentile(x, hi_pct)
    return np.clip((x - lo) / (hi - lo + 1e-9), 0, 1)


# ---- loudness (per video frame) ----
rms = np.sqrt(np.mean(framed(2048, HOP, nF) ** 2, axis=1))
db = 20 * np.log10(rms + 1e-6)
loud = norm01(db, 10, 99.5)
energy = norm01(smooth(loud, FPS * 2), 2, 99)

# ---- spectrum for melody + chroma ----
N = 4096
S = np.abs(np.fft.rfft(framed(N, HOP, nF) * np.hanning(N), axis=1)).astype(np.float32)
df = SR / N

# melody: harmonic-sum pitch salience, weights 1/h favour the true f0 over sub-harmonics
cand = np.arange(45, 86, 0.25)
sal = np.zeros((nF, len(cand)), np.float32)
Sc = np.sqrt(S)
for h in range(1, 6):
    b = 440 * 2 ** ((cand - 69) / 12) * h / df
    b0 = np.minimum(b.astype(int), S.shape[1] - 2)
    fr = (b - b0).astype(np.float32)
    sal += (Sc[:, b0] * (1 - fr) + Sc[:, b0 + 1] * fr) / h
pk = sal.argmax(1)
conf = sal.max(1) / (sal.mean(1) + 1e-9)
melody = cand[pk].astype(float)
voiced = (loud > 0.18) & (conf > np.percentile(conf, 25))
melody[~voiced] = 0
med = np.lib.stride_tricks.sliding_window_view(np.pad(melody, 3, mode='edge'), 7)
melody = np.where(voiced, np.median(med, axis=1), 0)

# chroma (65 Hz - 1.2 kHz, the vocal harmony range)
f = np.fft.rfftfreq(N, 1 / SR)
sel = (f > 65) & (f < 1200)
pc = np.round(12 * np.log2(f[sel] / 440) + 69).astype(int) % 12
chroma = np.zeros((nF, 12), np.float32)
L = np.log1p(10 * S[:, sel])
for k in range(12):
    chroma[:, k] = L[:, pc == k].sum(1)

# ---- onset envelope + DP beat tracker (Ellis 2007) ----
OH = 256
ofps = SR / OH
nO = len(y) // OH
Lo = np.log1p(100 * np.abs(np.fft.rfft(framed(1024, OH, nO) * np.hanning(1024), axis=1)))
flux = np.maximum(0, np.diff(Lo, axis=0, prepend=Lo[:1])).sum(1)
flux = np.maximum(0, flux - smooth(flux, ofps))
flux /= flux.std() + 1e-9
ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
lags = np.arange(int(ofps * 60 / 180), int(ofps * 60 / 55))
weight = np.exp(-0.5 * (np.log2(60 * ofps / lags / 110) / 0.9) ** 2)
P = lags[np.argmax(ac[lags] * weight)]
bpm = 60 * ofps / P
cum, back = flux.copy(), -np.ones(nO, int)
for t in range(int(P * 2), nO):
    prev = np.arange(t - 2 * P, t - P // 2)
    sc = cum[prev] - 100 * np.log((t - prev) / P) ** 2
    i = sc.argmax()
    cum[t] += sc[i]
    back[t] = prev[i]
t = nO - 2 * P + int(np.argmax(cum[-2 * P:]))
beats_o = []
while t >= 0:
    beats_o.append(t)
    t = back[t]
beats = sorted({int(round(b * OH / SR * FPS)) for b in beats_o})
onset = norm01(np.interp(np.arange(nF) / FPS, np.arange(nO) * OH / SR, flux), 0, 99.5)

# ---- chords per beat: templates + Viterbi ----
QUAL = {'': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], 'm7b5': [0, 3, 6, 10]}
temps, labels = [], []
for r in range(12):
    for q, iv in QUAL.items():
        v = np.zeros(12)
        v[[(r + i) % 12 for i in iv]] = 1
        temps.append(v / np.linalg.norm(v))
        labels.append((r, q))
T = np.array(temps)
penal = np.array([0.97 if len(QUAL[q]) == 4 else 1.0 for _, q in labels])
bounds = sorted(set([0] + beats + [nF]))
segs = [(a, b) for a, b in zip(bounds[:-1], bounds[1:]) if b > a]
bc = np.array([chroma[a:b].mean(0) for a, b in segs])
bc = bc - bc.min(1, keepdims=True)
bcn = bc / (np.linalg.norm(bc, axis=1, keepdims=True) + 1e-9)
score = bcn @ T.T * penal
dp, bp = score[0].copy(), np.zeros(score.shape, int)
for i in range(1, len(segs)):
    move = dp.max() - 0.08
    bp[i] = np.where(dp >= move, np.arange(len(labels)), dp.argmax())
    dp = np.maximum(dp, move) + score[i]
path = [int(dp.argmax())]
for i in range(len(segs) - 1, 0, -1):
    path.append(bp[i][path[-1]])
path = path[::-1]
seg_loud = np.array([loud[a:b].mean() for a, b in segs])
chords = []
for (a, b), ci, sl in zip(segs, path, seg_loud):
    r, q = labels[ci]
    name = 'N.C.' if sl < 0.08 else NAMES[r] + q
    if chords and chords[-1]['name'] == name:
        chords[-1]['end'] = b
    else:
        chords.append({'start': a, 'end': b, 'name': name, 'root': -1 if name == 'N.C.' else r, 'quality': q})

# downbeat phase (4/4): the phase where harmony changes most
nov = np.r_[0, 1 - (bcn[1:] * bcn[:-1]).sum(1)]
phase = int(np.argmax([nov[k::4].sum() for k in range(4)]))
downbeats = [b for i, b in enumerate(bounds[:-1]) if i % 4 == phase and b in beats]

# key: Krumhansl-Kessler profiles
maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
mnr = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
tot = (chroma * loud[:, None]).sum(0)
cands = [(np.corrcoef(tot, np.roll(p, r))[0, 1], NAMES[r] + (' major' if p is maj else ' minor')) for p in (maj, mnr) for r in range(12)]
key = max(cands)[1]

# ---- lyrics: align Lyric.txt words to whisper word timestamps ----
tok = lambda s: re.sub(r"[^a-z0-9]", '', s.lower())
lines, section = [], ''
for l in (ROOT / 'Lyric.txt').read_text(encoding='utf-8').splitlines():
    l = l.strip().rstrip('-')
    if l.startswith('['):
        section = l.strip('[]')
    elif l:
        lines.append({'text': l, 'section': section, 'words': l.split()})
ww = [w for w in json.loads((HERE / 'whisper_words.json').read_text(encoding='utf-8')) if w['s'] < duration - 1.0]
lw = [(li, w) for li, ln in enumerate(lines) for w in ln['words']]
sm = difflib.SequenceMatcher(None, [tok(w) for _, w in lw], [tok(w['w']) for w in ww], autojunk=False)
times = [None] * len(lw)
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        times[a + k] = (ww[b + k]['s'], ww[b + k]['e'])
anchors = [i for i, t in enumerate(times) if t]
last_end = ww[-1]['e']
for i, t in enumerate(times):
    if t:
        continue
    pa = max([a for a in anchors if a < i], default=None)
    nb = min([a for a in anchors if a > i], default=None)
    t0 = times[pa][1] if pa is not None else 0.0
    t1 = times[nb][0] if nb is not None else last_end
    lo_i = pa if pa is not None else -1
    step = (t1 - t0) / ((nb if nb is not None else len(lw)) - lo_i)
    times[i] = (t0 + step * (i - lo_i - 1), t0 + step * (i - lo_i))
for ln in lines:
    ln['words'] = []
for (li, w), (s, e) in zip(lw, times):
    lines[li]['words'].append({'w': w, 's': int(round(s * FPS)), 'e': int(round(e * FPS))})
for ln in lines:
    ln['start'], ln['end'] = ln['words'][0]['s'], ln['words'][-1]['e']

# ---- sections from lyric structure ----
dur_f = int(round(duration * FPS))
verse = [l for l in lines if l['section'].startswith('Verse')]
chorus = [l for l in lines if l['section'].startswith('Chorus')]
sec = [('intro', 0, verse[0]['start']), ('verse', verse[0]['start'], verse[-1]['end'] + 15)]
if chorus[0]['start'] - sec[-1][2] > 4 * FPS:
    sec.append(('interlude', sec[-1][2], chorus[0]['start']))
sec.append(('chorus', sec[-1][2], chorus[-1]['end']))
sec.append(('outro', chorus[-1]['end'], dur_f))
sections = [{'name': n, 'start': int(a), 'end': int(b), 'energy': round(float(loud[a:b].mean()), 3)} for n, a, b in sec if b > a]

r3 = lambda a: [round(float(v), 3) for v in a]
out = {
    'fps': FPS, 'durationInFrames': dur_f, 'duration': round(duration, 3), 'bpm': round(float(bpm), 1), 'key': key,
    'loud': r3(loud), 'energy': r3(energy), 'onset': r3(onset), 'melody': [round(float(m), 2) for m in melody],
    'beats': beats, 'downbeats': downbeats, 'chords': chords, 'lines': lines, 'sections': sections,
}
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(out, separators=(',', ':')), encoding='utf-8')

v = melody[melody > 0]
print(f'duration {duration:.2f}s  bpm {bpm:.1f}  key {key}  beats {len(beats)}  downbeats {len(downbeats)}')
print(f'melody range MIDI {v.min():.1f}-{v.max():.1f}, voiced {100 * len(v) / nF:.0f}%')
print('sections:', ', '.join(f"{s['name']} {s['start'] / FPS:.1f}-{s['end'] / FPS:.1f}s e={s['energy']}" for s in sections))
print('chords:', ' '.join(f"{c['name']}@{c['start'] / FPS:.1f}" for c in chords))
for ln in lines:
    print(f"  {ln['start'] / FPS:6.2f}-{ln['end'] / FPS:6.2f}  {ln['text']}")
