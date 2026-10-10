// Cyberpunk jazz MV, 1080x1920 (TikTok). Every motion is driven by the song analysis:
// loudness -> glow/scale/beams/grid, energy -> camera push/speed/shake, onsets -> glitch,
// beats/downbeats -> pulses/shard bursts, melody -> neon pitch line + butterfly flight,
// chords -> colour palette. No chord/section text is ever drawn.
import React from 'react';
import {AbsoluteFill, Html5Audio, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {A, accent, accent2, beatPulse, downPulse, energy, loud, onset, pitch, rgba, scroll, section, voiced} from './data';

const W = 1080, H = 1920, HORIZON = 1160;
const CL = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const FONT = '"Arial Black", "Segoe UI Black", Impact, sans-serif';
const img = (p: string) => staticFile(`assets/${p}.png`);
const vis = (f: number, a: number, b: number, ramp = 15) => (b <= a ? 0 : interpolate(f, [a - ramp, a, b, b + ramp], [0, 1, 1, 0], CL));
const glow = (px: number, c: number[]) => `drop-shadow(0 0 ${px.toFixed(1)}px ${rgba(c, 0.9)})`;

const INTRO = section('intro'), VERSE = section('verse'), INTER = section('interlude'), CHORUS = section('chorus');
const END = A.durationInFrames;

type SpriteProps = {src: string; x: number; y: number; w: number; t?: string; o?: number; filter?: string; blend?: boolean};
const Sprite: React.FC<SpriteProps> = ({src, x, y, w, t = '', o = 1, filter, blend}) =>
  o <= 0.001 ? null : (
    <Img
      src={img(src)}
      style={{position: 'absolute', left: x, top: y, width: w, opacity: Math.min(1, o), transform: `translate(-50%, -50%) ${t}`, filter, mixBlendMode: blend ? 'screen' : undefined}}
    />
  );

// ---------- background ----------
const STARS = Array.from({length: 90}, (_, i) => ({x: random(`x${i}`) * W, y: random(`y${i}`) * HORIZON, r: 1 + random(`r${i}`) * 3, p: random(`p${i}`) * 6.28}));

const Sky: React.FC<{f: number}> = ({f}) => {
  const a = accent(f), b = accent2(f), L = loud(f);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse 120% 70% at 50% 38%, ${rgba(a, 0.3 + 0.25 * L)} 0%, ${rgba(b, 0.12)} 40%, #070312 70%, #030108 100%)`}}>
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', left: s.x, top: s.y, width: s.r * 2, height: s.r * 2, borderRadius: '50%', background: i % 3 ? '#fff' : rgba(b),
            opacity: (0.25 + 0.75 * Math.abs(Math.sin(f / 22 + s.p))) * (0.4 + 0.6 * L), boxShadow: `0 0 ${4 + s.r * 3}px ${rgba(a)}`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const Ground: React.FC<{f: number}> = ({f}) => {
  const a = accent(f), L = loud(f), s = scroll(f);
  const sx = -((s * 0.6) % 1600);
  return (
    <>
      {[0, 1, 2].map((k) => (
        <Img key={k} src={img('02_city/04_skyline_strip')} style={{position: 'absolute', left: sx + k * 1600, top: HORIZON - 400, width: 1600, opacity: 0.85}} />
      ))}
      <div style={{position: 'absolute', left: 0, top: HORIZON, width: W, height: H - HORIZON, perspective: 500, perspectiveOrigin: '50% 0%', overflow: 'hidden', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 25%)'}}>
        <div
          style={{
            position: 'absolute', left: -W, width: W * 3, top: 0, height: 2400, transformOrigin: '50% 0%', transform: 'rotateX(68deg)',
            backgroundImage: `linear-gradient(${rgba(a, 0.9)} 3px, transparent 3px), linear-gradient(90deg, ${rgba(a, 0.9)} 3px, transparent 3px)`,
            backgroundSize: '140px 140px', backgroundPosition: `0 ${(s * 4) % 140}px`, opacity: 0.35 + 0.5 * L,
          }}
        />
      </div>
      <div style={{position: 'absolute', left: 0, top: HORIZON - 4, width: W, height: 8, background: rgba(a), boxShadow: `0 0 ${30 + 60 * L}px 10px ${rgba(a)}`, opacity: 0.8}} />
    </>
  );
};

const City: React.FC<{f: number; o: number}> = ({f, o}) => {
  if (o <= 0) return null;
  const L = loud(f), d = (f % 2000) * 0.05, fl = `${glow(10 + 30 * L, accent2(f))} brightness(${0.55 + 0.4 * L})`;
  return (
    <>
      <Sprite src="02_city/01_needle_tower" x={150 - d} y={HORIZON - 350} w={520} o={o} filter={fl} />
      <Sprite src="02_city/02_jazz_club_building" x={870 + d * 0.5} y={HORIZON - 230} w={620} o={o} filter={fl} />
      <Sprite src="02_city/03_rooftop_spire" x={650} y={330 + Math.sin(f / 40) * 20} w={330} o={o * 0.8} filter={fl} />
    </>
  );
};

const Beams: React.FC<{f: number; k: number}> = ({f, k}) => {
  if (k <= 0) return null;
  const o = (0.15 + 0.65 * loud(f)) * k;
  return (
    <>
      <Sprite src="04_lighting/02_light_beam" x={420} y={520} w={950} o={o} t={`rotate(${Math.sin(f / 45) * 12}deg)`} blend />
      <Sprite src="04_lighting/02_light_beam" x={660} y={520} w={950} o={o} t={`scaleX(-1) rotate(${Math.sin(f / 45 + 2) * 12}deg)`} blend />
      <Sprite src="04_lighting/01_spotlight" x={110} y={130} w={230} o={k} />
      <Sprite src="04_lighting/01_spotlight" x={970} y={130} w={230} o={k} t="scaleX(-1)" />
    </>
  );
};

// ---------- music-reactive layers ----------
// scrolling neon melody contour (piano-roll style), breaks where the voice rests
const MelodyLine: React.FC<{f: number; o: number}> = ({f, o}) => {
  if (o <= 0) return null;
  const a = accent(f), span = 150, head = W - 140;
  let d = '', pen = false;
  for (let k = span; k >= 0; k--) {
    if (!voiced(f - k)) { pen = false; continue; }
    d += `${pen ? 'L' : 'M'}${(head - (k / span) * head).toFixed(1)},${(430 - pitch(f - k) * 300).toFixed(1)} `;
    pen = true;
  }
  return (
    <svg width={W} height={H} style={{position: 'absolute', opacity: o, filter: `drop-shadow(0 0 10px ${rgba(a)})`}}>
      <path d={d} stroke={rgba(a)} strokeWidth={5 + 8 * loud(f)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={head} cy={430 - pitch(f) * 300} r={8 + 14 * loud(f)} fill="#fff" opacity={voiced(f) ? 1 : 0.3} />
    </svg>
  );
};

const RingViz: React.FC<{f: number; o: number}> = ({f, o}) => {
  if (o <= 0) return null;
  const a = accent(f), b = accent2(f);
  return (
    <div style={{position: 'absolute', left: 540, top: 740, opacity: o}}>
      {Array.from({length: 60}, (_, k) => {
        const g = f - (k % 30);
        const len = 14 + 170 * (loud(g) * 0.7 + onset(g) * 0.3);
        return (
          <div
            key={k}
            style={{
              position: 'absolute', left: -4, top: 0, width: 8, height: len, borderRadius: 4, background: rgba(k % 2 ? a : b),
              boxShadow: `0 0 12px ${rgba(a)}`, transformOrigin: '50% 0%', transform: `rotate(${k * 6 + f * 0.3}deg) translateY(370px)`,
            }}
          />
        );
      })}
    </div>
  );
};

// one hero asset per lyric line, chosen from the lyric's imagery
const HEROES = [
  '01_instruments/06_microphone', '06_fx/01_shard_burst', '04_lighting/01_spotlight', '06_fx/03_portal_ring',
  '03_signage/02_arrow_sign', '04_lighting/03_neon_tube', '05_decor/03_moon', '05_decor/01_butterfly',
  '03_signage/03_butterfly_sign', '05_decor/02_little_star', '01_instruments/06_microphone', '06_fx/01_shard_burst',
  '05_decor/03_moon', '05_decor/04_vinyl_record', '03_signage/01_jazz_sign', '06_fx/03_portal_ring',
];
const SPIN = new Set(['06_fx/01_shard_burst', '06_fx/03_portal_ring']);
const lineSpan = (i: number) => {
  const l = A.lines[i], nx = A.lines[i + 1];
  return [l.start - 6, nx && nx.start - l.end < 60 ? nx.start : l.end + 30];
};

const Hero: React.FC<{f: number}> = ({f}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {A.lines.map((_, i) => {
        const [a, b] = lineSpan(i);
        if (f < a - 2 || f > b + 12) return null;
        const src = HEROES[i % HEROES.length], L = loud(f);
        const inn = spring({frame: f - a, fps, config: {damping: 11, mass: 0.7}});
        const out = interpolate(f, [b, b + 12], [1, 0], CL);
        const s = inn * (0.85 + 0.3 * L + 0.1 * beatPulse(f)) * (1 + (1 - out) * 0.4);
        const rot = (1 - inn) * -30 + Math.sin(f / 28) * 5 + (SPIN.has(src) ? f * 0.8 : 0);
        return <Sprite key={i} src={src} x={540} y={740 + Math.sin(f / 24) * 16} w={620} o={inn * out} t={`scale(${s}) rotate(${rot}deg)`} filter={glow(18 + 50 * L, accent(f))} />;
      })}
    </>
  );
};

// wordless interlude: instrument parade, one per section of the vocalise, cut on downbeats
const INSTR = ['01_instruments/01_saxophone', '01_instruments/02_trumpet', '01_instruments/03_double_bass', '01_instruments/04_grand_piano', '01_instruments/05_snare_drum'];
const snap = (t: number) => A.downbeats.reduce((p, d) => (Math.abs(d - t) < Math.abs(p - t) ? d : p), t);
const CUTS = [INTER.start, ...INSTR.slice(1).map((_, k) => snap(INTER.start + ((k + 1) * (INTER.end - INTER.start)) / INSTR.length)), INTER.end];

const Instruments: React.FC<{f: number}> = ({f}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {INSTR.map((src, k) => {
        const a = CUTS[k], b = CUTS[k + 1];
        if (f < a - 2 || f > b + 12) return null;
        const side = k % 2 ? 1 : -1, L = loud(f);
        const inn = spring({frame: f - a, fps, config: {damping: 13}});
        const out = interpolate(f, [b - 4, b + 10], [0, 1], CL);
        const x = 540 + side * (1 - inn) * 900 - side * out * 900;
        const s = 0.9 + 0.25 * L + 0.15 * beatPulse(f);
        return <Sprite key={k} src={src} x={x} y={760} w={760} t={`scale(${s}) rotate(${Math.sin(f / 9) * 6 * L + side * (1 - inn) * 20}deg)`} filter={glow(20 + 50 * L, accent(f))} />;
      })}
    </>
  );
};

const Bursts: React.FC<{f: number}> = ({f}) => (
  <>
    {A.downbeats.filter((d) => d >= INTER.start && f >= d && f < d + 18).map((d) => {
      const t = (f - d) / 18;
      return <Sprite key={d} src="06_fx/01_shard_burst" x={150 + random(`bx${d}`) * 780} y={250 + random(`by${d}`) * 800} w={520} o={(1 - t) * 0.9} t={`scale(${0.3 + t * 1.3}) rotate(${random(`br${d}`) * 360 + t * 40}deg)`} blend />;
    })}
  </>
);

const STAR_POS = [[140, 330], [930, 560], [210, 1000], [880, 1060], [560, 200]];
const Stars: React.FC<{f: number; o: number}> = ({f, o}) =>
  o <= 0 ? null : (
    <>
      {STAR_POS.map(([x, y], i) => (
        <Sprite key={i} src="05_decor/02_little_star" x={x} y={y} w={110 + 40 * (i % 2)} o={o * (0.5 + 0.5 * Math.abs(Math.sin(f / 15 + i)))} t={`scale(${0.8 + 0.5 * beatPulse(f - i * 2)}) rotate(${f * (i % 2 ? 1 : -1)}deg)`} />
      ))}
    </>
  );

// chorus butterfly: flies along the melody (higher note = higher flight), flies off in the outro
const bfPos = (g: number) => ({x: 540 + 330 * Math.sin(g / 48), y: 1080 - pitch(g) * 720 - Math.max(0, g - CHORUS.end) * 24});
const Butterfly: React.FC<{f: number; o: number}> = ({f, o}) => {
  if (o <= 0) return null;
  const a = accent(f), b = accent2(f), L = loud(f), p = bfPos(f), q = bfPos(f - 3);
  let d = '';
  for (let k = 45; k >= 0; k--) {
    const r = bfPos(f - k);
    d += `${k === 45 ? 'M' : 'L'}${r.x.toFixed(1)},${(r.y + 20).toFixed(1)} `;
  }
  return (
    <>
      <svg width={W} height={H} style={{position: 'absolute', opacity: o, filter: `drop-shadow(0 0 12px ${rgba(b)})`}}>
        <path d={d} stroke={rgba(b, 0.9)} strokeWidth={4 + 10 * L} fill="none" strokeLinecap="round" />
      </svg>
      <Sprite src="05_decor/01_butterfly" x={p.x} y={p.y} w={300 + 80 * L} o={o} t={`rotate(${Math.max(-35, Math.min(35, (p.x - q.x) * 2))}deg) scaleX(${0.45 + 0.55 * Math.abs(Math.cos(f * 0.45))})`} filter={glow(15 + 40 * L, a)} />
    </>
  );
};

const Intro: React.FC<{f: number; o: number}> = ({f, o}) => {
  if (o <= 0) return null;
  const flick = f < 75 ? (random(`fl${Math.floor(f / 2)}`) > 0.45 ? 1 : 0.15) : 1;
  return (
    <>
      <Sprite src="05_decor/04_vinyl_record" x={540} y={820 + Math.sin(f / 20) * 12} w={720} o={o * interpolate(f, [0, 30], [0, 1], CL)} filter={glow(20 + 40 * loud(f), accent2(f))} />
      <Sprite src="03_signage/01_jazz_sign" x={540} y={430} w={720} o={o * flick} filter={glow(30, accent(f))} />
    </>
  );
};

const Glitch: React.FC<{f: number}> = ({f}) => {
  const O = onset(f);
  if (O < 0.6 || energy(f) < 0.45) return null;
  return (
    <>
      {[0, 1, 2, 3].map((k) => (
        <div key={k} style={{position: 'absolute', left: (random(`gx${f}-${k}`) - 0.5) * 200, top: random(`gy${f}-${k}`) * H, width: W, height: 4 + random(`gh${f}-${k}`) * 26, background: rgba(k % 2 ? accent(f) : accent2(f), 0.35 * O), mixBlendMode: 'screen'}} />
      ))}
    </>
  );
};

// ---------- text ----------
const TITLE = 'IF I HAVE NO TOMORROW';
const Title: React.FC<{f: number; o: number}> = ({f, o}) =>
  o <= 0 ? null : (
    <div style={{position: 'absolute', left: 0, width: W, top: 1300, textAlign: 'center', opacity: o, fontFamily: FONT, fontSize: 70, color: '#fff', letterSpacing: 6, textShadow: `0 0 24px ${rgba(accent(f))}, -3px 0 ${rgba(accent2(f), 0.8)}`}}>
      {TITLE.slice(0, Math.floor(interpolate(f, [25, 95], [0, TITLE.length], CL)))}
      <div style={{fontSize: 30, letterSpacing: 14, marginTop: 18, color: rgba(accent2(f)), opacity: interpolate(f, [95, 115], [0, 1], CL)}}>ACAPELLA · JAZZ</div>
    </div>
  );

// karaoke lyrics: each word lights up exactly when it is sung; RGB split follows onsets
const Lyrics: React.FC<{f: number}> = ({f}) => {
  const {fps} = useVideoConfig();
  const c = accent(f), c2 = accent2(f), g = 2 + 8 * onset(f) * energy(f), L = loud(f);
  return (
    <>
      {A.lines.map((l, k) => {
        const [a, b] = lineSpan(k);
        if (f < a || f > b + 10) return null;
        const inn = spring({frame: f - a, fps, config: {damping: 14}});
        const out = interpolate(f, [b - 2, b + 10], [0, 1], CL);
        return (
          <div key={k} style={{position: 'absolute', left: 60, width: 900, top: 1290, textAlign: 'center', opacity: Math.min(1, inn) * (1 - out), transform: `translateY(${(1 - inn) * 40 - out * 60}px)`, filter: out > 0 ? `blur(${out * 8}px)` : undefined, fontFamily: FONT, fontSize: 76, lineHeight: 1.15, textTransform: 'uppercase', letterSpacing: 2}}>
            {l.words.map((w, j) => {
              const on = f >= w.s - 2, active = on && f <= w.e + 4;
              const pop = spring({frame: f - (w.s - 2), fps, config: {damping: 10, mass: 0.5}});
              return (
                <span key={j} style={{display: 'inline-block', margin: '0 12px', color: active ? '#fff' : on ? '#efe6ff' : 'rgba(255,255,255,0.22)', transform: `scale(${on ? 0.9 + 0.1 * pop + (active ? 0.08 * L : 0) : 0.9})`, textShadow: on ? `${-g}px 0 ${rgba(c2, 0.8)}, ${g}px 0 ${rgba(c, 0.8)}, 0 0 ${active ? 18 + 40 * L : 14}px ${rgba(c)}` : 'none'}}>
                  {w.w}
                </span>
              );
            })}
          </div>
        );
      })}
    </>
  );
};

export const MV: React.FC = () => {
  const f = useCurrentFrame();
  const E = energy(f), L = loud(f);
  const vI = vis(f, 0, INTRO.end, 20), vV = vis(f, VERSE.start, VERSE.end, 20), vX = vis(f, INTER.start, INTER.end, 20), vC = vis(f, CHORUS.start, END + 30, 20);
  const zoom = 1 + 0.035 * E + 0.02 * beatPulse(f) + 0.03 * downPulse(f) * vC;
  const sh = onset(f) * E * 14;
  return (
    <AbsoluteFill style={{background: '#030108', overflow: 'hidden'}}>
      <Html5Audio src={staticFile('song.mp3')} />
      <AbsoluteFill style={{transform: `translate(${(random(`sx${f}`) - 0.5) * sh}px, ${(random(`sy${f}`) - 0.5) * sh}px) scale(${zoom})`}}>
        <Sky f={f} />
        <Sprite src="05_decor/03_moon" x={830} y={250} w={330} o={0.9 - 0.6 * vX} t={`rotate(${Math.sin(f / 90) * 8}deg)`} filter={glow(20 + 30 * L, accent2(f))} />
        <MelodyLine f={f} o={Math.max(vV, vX) * 0.85} />
        <Ground f={f} />
        <City f={f} o={Math.max(vV, vI * 0.6, vC * 0.45)} />
        <Beams f={f} k={Math.max(vV * 0.7, vX * 0.5, vC)} />
        <Sprite src="06_fx/03_portal_ring" x={540} y={760} w={900} o={Math.max(vX, vC) * 0.85} t={`rotate(${f * 0.6}deg) scale(${1 + 0.25 * L})`} blend />
        <RingViz f={f} o={Math.max(vX, vC)} />
        <Sprite src="06_fx/02_waveform_ribbon" x={540} y={1150} w={1000} o={vX * 0.75} t={`scaleY(${0.25 + 0.7 * L})`} blend />
        <Intro f={f} o={vI} />
        <Instruments f={f} />
        <Stars f={f} o={vC} />
        <Hero f={f} />
        <Bursts f={f} />
        <Butterfly f={f} o={vC} />
        <Glitch f={f} />
      </AbsoluteFill>
      <Lyrics f={f} />
      <Title f={f} o={vis(f, 0, INTRO.end - 25, 15)} />
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 2px, transparent 2px, transparent 5px)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)'}} />
      <AbsoluteFill style={{background: rgba(accent(f), 0.18 * downPulse(f) * vC), mixBlendMode: 'screen'}} />
      <AbsoluteFill style={{background: '#000', opacity: Math.max(interpolate(f, [0, 20], [1, 0], CL), interpolate(f, [END - 40, END - 1], [0, 1], CL))}} />
    </AbsoluteFill>
  );
};
