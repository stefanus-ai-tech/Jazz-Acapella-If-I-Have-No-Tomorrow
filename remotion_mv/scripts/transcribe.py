# Word-level lyric timestamps via faster-whisper (cached locally, no download)
import json, sys
from pathlib import Path
from faster_whisper import WhisperModel

root = Path(__file__).resolve().parents[2]
mp3 = root / 'v5 If I Have No Tomorrow acapella jazz.mp3'
lyrics = ' '.join(l for l in (root / 'Lyric.txt').read_text(encoding='utf-8').splitlines() if l and not l.startswith('['))
model = WhisperModel('medium.en', device='cpu', compute_type='int8')
segs, _ = model.transcribe(str(mp3), language='en', word_timestamps=True, initial_prompt=lyrics, beam_size=5, vad_filter=False)
words = []
for s in segs:
    print(f'[{s.start:6.2f}-{s.end:6.2f}] {s.text}', flush=True)
    words += [{'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3)} for w in s.words]
Path(sys.argv[1]).write_text(json.dumps(words, indent=1), encoding='utf-8')
