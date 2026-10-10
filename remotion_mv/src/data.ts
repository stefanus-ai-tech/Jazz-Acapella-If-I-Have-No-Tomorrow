// Song analysis (scripts/analyze.py) turned into per-frame lookups for the visuals.
// Chords and sections are never shown as text: they only drive colour and scene choice.
import raw from '../public/analysis.json';

export type Word = {w: string; s: number; e: number};
export type Line = {text: string; section: string; start: number; end: number; words: Word[]};
export type Chord = {start: number; end: number; name: string; root: number; quality: string};
export type Section = {name: string; start: number; end: number; energy: number};
type Analysis = {
  fps: number; durationInFrames: number; bpm: number; key: string;
  loud: number[]; energy: number[]; onset: number[]; melody: number[];
  beats: number[]; downbeats: number[]; chords: Chord[]; lines: Line[]; sections: Section[];
};

export const A = raw as Analysis;
const N = A.durationInFrames + 1;
const idx = (f: number) => Math.max(0, Math.min(A.loud.length - 1, Math.round(f)));

export const loud = (f: number) => A.loud[idx(f)];
export const energy = (f: number) => A.energy[idx(f)];
export const onset = (f: number) => A.onset[idx(f)];
export const voiced = (f: number) => A.melody[idx(f)] > 0;

// exponential decay since the last beat / downbeat
const pulses = (list: number[], decay: number) => {
  const out = new Float32Array(N);
  let j = -1;
  for (let f = 0; f < N; f++) {
    while (j + 1 < list.length && list[j + 1] <= f) j++;
    out[f] = j < 0 ? 0 : Math.exp(-(f - list[j]) / decay);
  }
  return out;
};
const bp = pulses(A.beats, 5);
const dp = pulses(A.downbeats, 8);
export const beatPulse = (f: number) => bp[idx(f)];
export const downPulse = (f: number) => dp[idx(f)];

// melody pitch held through unvoiced gaps and smoothed -> 0 (low) .. 1 (high)
const mel = new Float32Array(N);
const scr = new Float32Array(N);
{
  let held = 62, m = 62, s = 0;
  for (let f = 0; f < N; f++) {
    const v = A.melody[idx(f)];
    if (v > 0) held = v;
    m += (held - m) * 0.25;
    mel[f] = Math.max(0, Math.min(1, (m - 52) / 28));
    s += 0.5 + 2 * A.energy[idx(f)];
    scr[f] = s;
  }
}
export const pitch = (f: number) => mel[idx(f)];
export const scroll = (f: number) => scr[idx(f)];

// chord colours: quality sets the mood colour, root picks the secondary neon
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const QC: Record<string, string> = {'': '#FFE600', m: '#B42CFF', '7': '#FF2AAF', maj7: '#00E5FF', m7: '#8B2CFF', m7b5: '#2055FF'};
const SEC = ['#00E5FF', '#FF2AAF', '#8B2CFF', '#2055FF', '#FFE600'];
const cols = (c?: Chord) =>
  !c || c.root < 0 ? [hex('#2055FF'), hex('#8B2CFF')] : [hex(QC[c.quality] ?? '#8B2CFF'), hex(SEC[((c.root * 7) % 12) % 5])];
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
const accA: number[][] = [], accB: number[][] = [];
for (let f = 0, ci = 0; f < N; f++) {
  while (ci + 1 < A.chords.length && A.chords[ci + 1].start <= f) ci++;
  const c = A.chords[ci], [pa, pb] = cols(A.chords[ci - 1]), [ca, cb] = cols(c);
  const t = Math.min(1, (f - c.start) / 15);
  accA.push(mix(pa, ca, t));
  accB.push(mix(pb, cb, t));
}
export const rgba = (c: number[], a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const accent = (f: number) => accA[idx(f)];
export const accent2 = (f: number) => accB[idx(f)];

export const section = (name: string) => A.sections.find((s) => s.name === name) ?? {name, start: 0, end: 0, energy: 0};
