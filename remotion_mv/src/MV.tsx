// "If I Have No Tomorrow" — Persona-style MV in a cyberpunk palette, 1080x1920 (TikTok).
// One scene per lyric line (+ intro, interlude "showtime/cut-ins/all-out", outro), each with its own gimmick.
// Audio analysis drives everything: loudness -> scale/glow/beams, energy -> camera/speed,
// onsets -> shake/glitch, beats/downbeats -> slams/bursts/montage cuts, melody -> flight paths/constellation,
// chords -> accent colours. No chord/section text is ever drawn.
import React from 'react';
import {AbsoluteFill, Html5Audio, Img, interpolate, random, spring, staticFile, useCurrentFrame} from 'remotion';
import {A, accent, beatPulse, downPulse, energy, loud, onset, pitch, rgba, scroll, section, voiced} from './data';

const W = 1080, H = 1920, FPS = 30;
const INK = '#07040f', MAG = '#FF2AAF', CYAN = '#00E5FF', YEL = '#FFE600', PUR = '#8B2CFF', COB = '#2055FF', WH = '#ffffff';
const CL = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const FONT = '"Arial Black", Impact, sans-serif';
const FONTS = ['"Arial Black"', 'Impact', 'Georgia', '"Times New Roman"', '"Courier New"', 'Bahnschrift', '"Trebuchet MS"', 'Verdana'];
const R = (s: string) => random(s);
const img = (p: string) => staticFile(`assets/${p}.png`);
const hard = (c: string, d = 14) => `drop-shadow(${d}px ${d}px 0 ${c})`;
const sil = (c: string, d = 14) => `brightness(0) ${hard(c, d)}`;
const whiteSil = (c: string, d = 12) => `brightness(0) invert(1) ${hard(c, d)}`;
const pop = (t: number, damping = 10, mass = 0.6) => spring({frame: t, fps: FPS, config: {damping, mass}});
const tok = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

type P = {f: number; t: number; d: number; k: number};

// ---------------- primitives ----------------
type SpriteProps = {src: string; x: number; y: number; w: number; t?: string; o?: number; filter?: string; blend?: boolean};
const Sprite: React.FC<SpriteProps> = ({src, x, y, w, t = '', o = 1, filter, blend}) =>
  o <= 0.001 ? null : (
    <Img src={img(src)} style={{position: 'absolute', left: x, top: y, width: w, opacity: Math.min(1, o), transform: `translate(-50%, -50%) ${t}`, filter, mixBlendMode: blend ? 'screen' : undefined}} />
  );

const Fill: React.FC<{bg: string; children?: React.ReactNode}> = ({bg, children}) => <AbsoluteFill style={{background: bg}}>{children}</AbsoluteFill>;

const Rays: React.FC<{a: string; b: string; rot: number; n?: number; x?: string; y?: string; o?: number}> = ({a, b, rot, n = 18, x = '50%', y = '42%', o = 1}) => {
  const s = 180 / n;
  return <AbsoluteFill style={{opacity: o, background: `repeating-conic-gradient(from ${rot}deg at ${x} ${y}, ${a} 0deg ${s}deg, ${b} ${s}deg ${2 * s}deg)`}} />;
};

const Halftone: React.FC<{c: string; s?: number; dir?: string; o?: number}> = ({c, s = 24, dir = 'to top', o = 1}) => (
  <AbsoluteFill style={{opacity: o, backgroundImage: `radial-gradient(circle, ${c} 32%, transparent 36%)`, backgroundSize: `${s}px ${s}px`, WebkitMaskImage: `linear-gradient(${dir}, black 0%, transparent 85%)`}} />
);

const Stripes: React.FC<{a: string; b: string; t: number; w?: number; angle?: number; speed?: number}> = ({a, b, t, w = 70, angle = 45, speed = 6}) => {
  const per = (2 * w) / Math.abs(Math.sin((angle * Math.PI) / 180));
  return <div style={{position: 'absolute', left: -per * 2, top: 0, width: W + per * 4, height: H, background: `repeating-linear-gradient(${angle}deg, ${a} 0 ${w}px, ${b} ${w}px ${2 * w}px)`, transform: `translateX(${((t * speed) % per + per) % per}px)`}} />;
};

const burstPts = (seed: string, n: number, r: number) =>
  Array.from({length: n * 2}, (_, k) => {
    const a = (k / (n * 2)) * Math.PI * 2, rr = k % 2 ? r * 0.55 * (0.6 + 0.4 * R(`${seed}i${k}`)) : r * (0.8 + 0.4 * R(`${seed}o${k}`));
    return `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`;
  }).join(' ');
const Burst: React.FC<{x: number; y: number; r: number; c: string; rot?: number; s?: number; stroke?: string; seed?: string; n?: number}> = ({x, y, r, c, rot = 0, s = 1, stroke, seed = 'b', n = 14}) => (
  <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
    <polygon points={burstPts(seed, n, r)} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} fill={c} stroke={stroke} strokeWidth={stroke ? 16 : 0} />
  </svg>
);

// ransom-note lettering: every letter its own cut-out box, font and tilt
const BOX: [string, string][] = [[WH, INK], [INK, WH], [MAG, WH], [CYAN, INK], [YEL, INK], [INK, MAG], [PUR, WH]];
// words never break mid-word; a word too long for the frame is shrunk to fit
const Ransom: React.FC<{text: string; t: number; size: number; seed: string; stagger?: number}> = ({text, t, size: want, seed, stagger = 2}) => {
  const size = Math.min(want, (W - 140) / (Math.max(...text.split(' ').map((w) => w.length)) * 0.95));
  let k0 = 0;
  return (
    <span style={{display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: `0 ${size * 0.3}px`}}>
      {text.split(' ').map((word, wi) => {
        const base = k0;
        k0 += word.length;
        return (
          <span key={wi} style={{display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap'}}>
            {[...word].map((ch, j) => <RansomLetter key={j} ch={ch} k={base + j} t={t} size={size} seed={seed} stagger={stagger} />)}
          </span>
        );
      })}
    </span>
  );
};
const RansomLetter: React.FC<{ch: string; k: number; t: number; size: number; seed: string; stagger: number}> = ({ch, k, t, size, seed, stagger}) => {
  const r = (s: string) => R(`${seed}${k}${s}`);
  const [bg, fg] = BOX[Math.floor(r('b') * BOX.length)];
  const p = pop(t - k * stagger, 9, 0.5);
  return (
    <span
      style={{
        display: 'inline-block', fontFamily: FONTS[Math.floor(r('f') * FONTS.length)], fontWeight: 900, fontSize: size * (0.78 + 0.45 * r('s')), lineHeight: 1.08,
        padding: '0 0.1em', margin: '0 0.025em', background: bg, color: fg, opacity: p > 0.02 ? 1 : 0,
        transform: `translateY(${(r('y') - 0.5) * size * 0.22}px) rotate(${(r('r') - 0.5) * 26}deg) scale(${p})`, boxShadow: `${size * 0.06}px ${size * 0.06}px 0 ${r('c') > 0.5 ? MAG : CYAN}`,
      }}
    >
      {ch}
    </span>
  );
};
const At: React.FC<{y: number; rot?: number; children: React.ReactNode}> = ({y, rot = 0, children}) => (
  <div style={{position: 'absolute', left: 40, width: W - 80, top: y, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '12px 14px', transform: `rotate(${rot}deg)`}}>{children}</div>
);

// lyric line: slanted word boxes slam in on their sung frame; the key word becomes a ransom note
const KEY = ['myself', 'worse', 'everybody', 'gone', 'fair', 'there', 'sky', 'be', 'butterfly', 'star', 'best', 'flaw', 'tomorrow', 'borrow', 'sinful', 'forgiven'];
const kwFrame = (i: number) => (A.lines[i].words.find((w) => tok(w.w) === KEY[i]) ?? A.lines[i].words[0]).s;
const WBOX: [string, string, string][] = [[INK, WH, MAG], [WH, INK, CYAN], [INK, YEL, PUR], [MAG, WH, INK]];
const Lyric: React.FC<{i: number; f: number; y: number; rot?: number; size?: number; seed?: string}> = ({i, f, y, rot = -3, size = 62, seed = ''}) => (
  <At y={y} rot={rot}>
    {A.lines[i].words.map((w, j) => {
      const t = f - (w.s - 3);
      if (tok(w.w) === KEY[i]) return <Ransom key={j} text={w.w.toUpperCase()} t={t} size={size * 1.75} seed={`k${i}${seed}`} />;
      const p = pop(t, 12, 0.4);
      const [bg, fg, sh] = WBOX[(i + j) % WBOX.length];
      return (
        <span key={j} style={{display: 'inline-block', fontFamily: FONT, fontSize: size, lineHeight: 1.15, padding: '2px 18px', background: bg, color: fg, opacity: t < 0 ? 0 : Math.min(1, p * 2), transform: `skewX(-12deg) rotate(${(R(`w${i}-${j}`) - 0.5) * 8}deg) scale(${t < 0 ? 1 : interpolate(p, [0, 1], [2.4, 1])})`, boxShadow: `8px 8px 0 ${sh}`}}>
          {w.w.toUpperCase()}
        </span>
      );
    })}
  </At>
);

// broken glass: content rendered once per shard (clip-path), shards pushed outward by `amt`
const shards = (seed: string, cx: number, cy: number, n = 8) => {
  const angs = Array.from({length: n}, (_, k) => ((k + 0.25 + R(`${seed}a${k}`) * 0.5) / n) * Math.PI * 2);
  const rin = angs.map((_, k) => 200 + R(`${seed}r${k}`) * 260);
  const pt = (a: number, r: number) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  const px = (p: number[]) => `${p[0].toFixed(0)}px ${p[1].toFixed(0)}px`;
  const pieces: {clip: string; dx: number; dy: number; sp: number; rot: number}[] = [];
  let lines = '';
  angs.forEach((a0, k) => {
    const k1 = (k + 1) % n, a1 = k1 === 0 ? angs[0] + Math.PI * 2 : angs[k1], m = (a0 + a1) / 2;
    pieces.push({clip: `polygon(${cx}px ${cy}px, ${px(pt(a0, rin[k]))}, ${px(pt(a1, rin[k1]))})`, dx: Math.cos(m), dy: Math.sin(m), sp: 1.4 + R(`${seed}s${k}`) * 0.6, rot: R(`${seed}q${k}`) - 0.5});
    pieces.push({clip: `polygon(${px(pt(a0, rin[k]))}, ${px(pt(a0, 2400))}, ${px(pt(a1, 2400))}, ${px(pt(a1, rin[k1]))})`, dx: Math.cos(m), dy: Math.sin(m), sp: 0.7 + R(`${seed}t${k}`) * 0.6, rot: R(`${seed}u${k}`) - 0.5});
    const [ex, ey] = pt(a0, 2400), [ix, iy] = pt(a0, rin[k]), [jx, jy] = pt(a1, rin[k1]);
    lines += `M${cx},${cy} L${ex.toFixed(0)},${ey.toFixed(0)} M${ix.toFixed(0)},${iy.toFixed(0)} L${jx.toFixed(0)},${jy.toFixed(0)} `;
  });
  return {pieces, lines};
};
const Shatter: React.FC<{seed: string; amt: number; crack: number; cx?: number; cy?: number; children: React.ReactNode}> = ({seed, amt, crack, cx = 540, cy = 820, children}) => {
  const g = shards(seed, cx, cy);
  return (
    <>
      {g.pieces.map((p, k) => (
        <AbsoluteFill key={k} style={{clipPath: p.clip, transform: `translate(${p.dx * amt * p.sp}px, ${p.dy * amt * p.sp}px) rotate(${p.rot * amt * 0.08}deg)`}}>
          {children}
        </AbsoluteFill>
      ))}
      {crack > 0 && (
        <svg width={W} height={H} style={{position: 'absolute', opacity: crack}}>
          <path d={g.lines} stroke={WH} strokeWidth={6} fill="none" />
        </svg>
      )}
    </>
  );
};

const DownBursts: React.FC<{f: number; a: number}> = ({f, a}) => (
  <>
    {A.downbeats.filter((d) => d >= a && f >= d && f < d + 16).map((d) => {
      const p = (f - d) / 16;
      return <Sprite key={d} src="06_fx/01_shard_burst" x={120 + R(`bx${d}`) * 840} y={200 + R(`by${d}`) * 1000} w={560} o={1 - p} t={`scale(${0.3 + p * 1.4}) rotate(${R(`br${d}`) * 360 + p * 50}deg)`} />;
    })}
  </>
);

const Rise: React.FC<{t: number; c: string; n?: number}> = ({t, c, n = 36}) => (
  <>
    {Array.from({length: n}, (_, j) => {
      const sp = 6 + R(`rs${j}`) * 14, s = 12 + R(`rz${j}`) * 34;
      return <div key={j} style={{position: 'absolute', left: R(`rx${j}`) * W, top: H + 100 - ((t * sp + R(`ry${j}`) * (H + 200)) % (H + 200)), width: s, height: s, background: j % 3 ? c : WH, transform: 'rotate(45deg)', opacity: 0.85}} />;
    })}
  </>
);

const Rain: React.FC<{t: number}> = ({t}) => (
  <>
    {Array.from({length: 50}, (_, j) => (
      <div key={j} style={{position: 'absolute', left: R(`wx${j}`) * W, top: ((t * (40 + R(`wy${j}`) * 30) + R(`wo${j}`) * H) % (H + 200)) - 100, width: 3, height: 90, background: 'rgba(255,255,255,0.35)', transform: 'rotate(12deg)'}} />
    ))}
  </>
);

// ---------------- scenes ----------------
const Intro: React.FC<P> = ({f, t, d}) => {
  const c = pop(t - 6, 13, 0.9), fly = interpolate(t, [d - 16, d], [1, 4], CL);
  return (
    <Fill bg={INK}>
      <Rays a={rgba(accent(f), 0.22)} b="transparent" rot={t * 0.5} n={20} />
      <Halftone c={MAG} s={26} />
      <AbsoluteFill style={{transform: `translateY(${(1 - c) * 1500}px) rotate(${-5 + (1 - c) * 25}deg) scale(${fly})`}}>
        <div style={{position: 'absolute', left: 110, top: 360, width: 860, height: 1150, background: WH, clipPath: 'polygon(0 3%, 100% 0, 97% 100%, 3% 96%)', boxShadow: `0 0 0 0 ${MAG}`}} />
        <div style={{position: 'absolute', left: 150, top: 400, width: 780, height: 1070, backgroundImage: `radial-gradient(circle, rgba(255,42,175,0.28) 30%, transparent 34%)`, backgroundSize: '18px 18px', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 60%)'}} />
        <Sprite src="03_signage/03_butterfly_sign" x={540} y={700} w={560} t={`rotate(${Math.sin(t / 12) * 4}deg) scale(${1 + 0.08 * beatPulse(f)})`} filter={hard(INK, 10)} />
        <At y={1030} rot={-4}><Ransom text="IF I HAVE" t={t - 30} size={96} seed="ti1" /></At>
        <At y={1170} rot={3}><Ransom text="NO TOMORROW" t={t - 48} size={96} seed="ti2" /></At>
        <div style={{position: 'absolute', left: 0, width: W, top: 1360, textAlign: 'center', fontFamily: '"Courier New"', fontWeight: 900, fontSize: 34, letterSpacing: 10, color: INK, opacity: interpolate(t, [80, 95], [0, 1], CL)}}>— ACAPELLA · JAZZ —</div>
      </AbsoluteFill>
    </Fill>
  );
};

// "When I lose myself" — spotlight on the mic, the whole frame shatters on "myself"
const S0: React.FC<P> = ({f, t, k}) => {
  const s = t - (kwFrame(k) - (f - t)) - 6, L = loud(f);
  const scene = (
    <Fill bg={INK}>
      <Halftone c={PUR} s={22} dir="to bottom" o={0.8} />
      <div style={{position: 'absolute', left: -300, top: 620, width: 1700, height: 480, background: WH, transform: `rotate(-14deg) translateX(${(1 - pop(t, 14)) * -1800}px)`}} />
      <Sprite src="04_lighting/02_light_beam" x={540} y={560} w={1000} o={0.4 + 0.6 * L} t="rotate(35deg)" blend />
      <Sprite src="01_instruments/06_microphone" x={540} y={860} w={620} t={`scale(${1 + 0.1 * L + 0.05 * beatPulse(f)}) rotate(${Math.sin(t / 30) * 4}deg)`} filter={hard(MAG, 18)} />
    </Fill>
  );
  return (
    <>
      {s < 0 ? scene : <Shatter seed="s0" amt={s * s * 1.4} crack={interpolate(s, [0, 8], [1, 0], CL)}>{scene}</Shatter>}
      <Lyric i={k} f={f} y={1430} />
    </>
  );
};

// "It can be worse than this" — hazard stripes, spinning burst, neon tube whirling
const S1: React.FC<P> = ({f, t, k}) => {
  const L = loud(f);
  return (
    <Fill bg={INK}>
      <Stripes a={YEL} b={INK} t={t} w={60} speed={14} />
      <AbsoluteFill style={{background: 'rgba(7,4,15,0.35)'}} />
      <Burst x={540} y={820} r={600} c={MAG} stroke={INK} rot={t * 3} s={0.85 + 0.35 * L} seed="w1" />
      <Sprite src="06_fx/01_shard_burst" x={540} y={820} w={900} t={`rotate(${-t * 4}deg) scale(${0.8 + 0.5 * L})`} />
      <Sprite src="04_lighting/03_neon_tube" x={540} y={820} w={540} t={`rotate(${t * 6}deg)`} filter={hard(INK, 16)} />
      <Lyric i={k} f={f} y={1400} rot={4} />
    </Fill>
  );
};

// "Even when everybody knows" — comic panels slam in, the whole city is watching
const PANELS = [
  {clip: 'polygon(0 0, 100% 0, 100% 30%, 0 38%)', bg: WH, ht: CYAN, src: '02_city/01_needle_tower', x: 330, y: 360, w: 430, filt: sil(CYAN, 12), from: -1},
  {clip: 'polygon(0 38%, 100% 30%, 100% 66%, 0 72%)', bg: MAG, ht: INK, src: '02_city/02_jazz_club_building', x: 560, y: 980, w: 720, filt: hard(INK, 14), from: 1},
  {clip: 'polygon(0 72%, 100% 66%, 100% 100%, 0 100%)', bg: INK, ht: PUR, src: '02_city/03_rooftop_spire', x: 860, y: 1700, w: 380, filt: hard(CYAN, 12), from: -1},
];
const S2: React.FC<P> = ({f, t, k}) => (
  <Fill bg={INK}>
    {PANELS.map((p, j) => {
      const e = pop(t - j * 10, 13, 0.8);
      return (
        <AbsoluteFill key={j} style={{clipPath: p.clip, transform: `translateX(${(1 - e) * 1300 * p.from}px)`}}>
          <Fill bg={p.bg}>
            <Halftone c={p.ht} s={20} dir={j % 2 ? 'to left' : 'to right'} o={0.7} />
            <Sprite src={p.src} x={p.x + Math.sin((t + j * 20) / 25) * 20} y={p.y} w={p.w * (1 + 0.07 * beatPulse(f))} filter={p.filt} />
          </Fill>
        </AbsoluteFill>
      );
    })}
    <svg width={W} height={H} style={{position: 'absolute'}}>
      <path d={`M0,${0.38 * H} L${W},${0.3 * H} M0,${0.72 * H} L${W},${0.66 * H}`} stroke={YEL} strokeWidth={16} />
    </svg>
    <Lyric i={k} f={f} y={1420} rot={-6} />
  </Fill>
);

// "I will be gone" — vortex swallows the singer, white-out
const S3: React.FC<P> = ({f, t, d, k}) => {
  const p = t / d, L = loud(f);
  return (
    <Fill bg={INK}>
      <Rays a={PUR} b={INK} rot={-scroll(f) * 3} n={22} o={0.9} />
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 42%, transparent 8%, ${INK} 70%)`}} />
      <Sprite src="06_fx/03_portal_ring" x={540} y={800} w={900} t={`rotate(${t * 5}deg) scale(${0.6 + p * 1.1 + 0.15 * L})`} />
      <Sprite src="01_instruments/06_microphone" x={540} y={800} w={420} t={`scale(${Math.max(0, 1 - p * 1.2)}) rotate(${p * 720}deg)`} filter={whiteSil(MAG, 10)} />
      <AbsoluteFill style={{background: WH, opacity: interpolate(t, [d - 10, d - 2], [0, 1], CL)}} />
      <Lyric i={k} f={f} y={1430} />
    </Fill>
  );
};

// "Sometimes life's not fair" — lopsided split screen that inverts on every downbeat
const S4: React.FC<P> = ({f, k}) => {
  const L = loud(f), flip = A.downbeats.filter((x) => x <= f).length % 2 === 0, tilt = 6 + 12 * L;
  return (
    <Fill bg={flip ? INK : WH}>
      <Halftone c={flip ? MAG : PUR} s={24} o={0.7} />
      <AbsoluteFill style={{background: flip ? WH : INK, clipPath: `polygon(0 0, 100% 0, 100% ${40 - tilt}%, 0 ${48 + tilt}%)`}}>
        <Halftone c={flip ? CYAN : MAG} s={24} dir="to bottom" o={0.6} />
        <Sprite src="03_signage/02_arrow_sign" x={560} y={430} w={780} t={`rotate(${-tilt}deg) scale(${1.1 + 0.12 * beatPulse(f)})`} filter={flip ? sil(MAG, 14) : hard(CYAN, 14)} />
      </AbsoluteFill>
      <Sprite src="03_signage/02_arrow_sign" x={520} y={1080} w={480} t={`scaleX(-1) rotate(${tilt}deg) scale(${0.8 + 0.1 * beatPulse(f)})`} filter={flip ? hard(MAG, 12) : sil(CYAN, 12)} />
      <Lyric i={k} f={f} y={1400} rot={5} />
    </Fill>
  );
};

// "And I could have been there" — rainy magenta night, the club as a tilted memory photo
const S5: React.FC<P> = ({f, t, d, k}) => {
  const z = interpolate(t, [0, d], [0.92, 1.08]), j = onset(f) * 14;
  const frame = (dx: number, bg: string, o: number) => (
    <div style={{position: 'absolute', left: 120 + dx, top: 360, width: 840, height: 760, transform: `rotate(-5deg) scale(${z})`, background: bg, opacity: o}} />
  );
  return (
    <Fill bg={`linear-gradient(to bottom, ${PUR} 0%, ${MAG} 75%, ${INK} 100%)`}>
      <Halftone c={INK} s={22} o={0.6} />
      <Img src={img('02_city/04_skyline_strip')} style={{position: 'absolute', left: -200, top: 1050, width: 1500, filter: 'brightness(0)'}} />
      <Sprite src="02_city/01_needle_tower" x={130} y={1000} w={420} filter="brightness(0)" />
      <Rain t={t} />
      {frame(-12 - j, CYAN, 0.8)}
      {frame(12 + j, MAG, 0.8)}
      <div style={{position: 'absolute', left: 120, top: 360, width: 840, height: 760, transform: `rotate(-5deg) scale(${z})`, border: `18px solid ${WH}`, boxShadow: `22px 22px 0 ${INK}`, overflow: 'hidden', background: COB}}>
        <Sprite src="02_city/02_jazz_club_building" x={402} y={380} w={820} filter="saturate(0.7) contrast(1.15)" t={`scale(${1 + 0.06 * loud(f)})`} />
        <Halftone c={CYAN} s={14} dir="to bottom" o={0.35} />
        <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 3px, transparent 3px 7px)'}} />
      </div>
      <Lyric i={k} f={f} y={1400} rot={-4} />
    </Fill>
  );
};

// "So I just stare into the sky" — camera tilts up; the melody is drawn as a constellation
const STARS = Array.from({length: 110}, (_, i) => ({x: R(`sx${i}`) * W, y: -900 + R(`sy${i}`) * 2100, r: 1 + R(`sr${i}`) * 3, p: R(`sp${i}`) * 6.28}));
const S6: React.FC<P> = ({f, t, d, k}) => {
  const pan = interpolate(t, [0, d], [0, 800], CL), L = loud(f);
  const pts: number[][] = [];
  for (let j = 0; j < 18; j++) if (voiced(f - j * 7)) pts.push([960 - j * 50, 220 + (1 - pitch(f - j * 7)) * 360, j]);
  return (
    <Fill bg={`linear-gradient(to top, ${PUR} 0%, ${COB} 45%, ${INK} 100%)`}>
      <AbsoluteFill style={{transform: `translateY(${pan}px)`}}>
        {STARS.map((s, i) => (
          <div key={i} style={{position: 'absolute', left: s.x, top: s.y, width: s.r * 2, height: s.r * 2, borderRadius: '50%', background: WH, opacity: 0.3 + 0.7 * Math.abs(Math.sin(t / 18 + s.p)), boxShadow: `0 0 ${6 + s.r * 3}px ${CYAN}`}} />
        ))}
        <Sprite src="05_decor/03_moon" x={600} y={-260} w={560} t={`rotate(${t * 0.1}deg)`} filter={hard(CYAN, 12)} />
        <Img src={img('02_city/04_skyline_strip')} style={{position: 'absolute', left: -300, top: 1350, width: 1700, filter: `brightness(0) ${hard(MAG, 8)}`}} />
        <Sprite src="02_city/01_needle_tower" x={880} y={1420} w={520} filter={sil(MAG, 10)} />
      </AbsoluteFill>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        {pts.map((p, j) => (j > 0 && pts[j - 1][2] === p[2] - 1 ? <line key={`l${j}`} x1={pts[j - 1][0]} y1={pts[j - 1][1]} x2={p[0]} y2={p[1]} stroke={CYAN} strokeWidth={3} opacity={0.8} /> : null))}
        {pts.map((p, j) => <circle key={j} cx={p[0]} cy={p[1]} r={(p[2] === 0 ? 14 + 16 * L : 7) as number} fill={WH} opacity={1 - p[2] / 20} />)}
      </svg>
      <Lyric i={k} f={f} y={1380} rot={-2} />
    </Fill>
  );
};

// "And will I be" — a butterfly crosses the moon, tension builds into the interlude
const S7: React.FC<P> = ({f, t, d, k}) => {
  const p = t / d;
  return (
    <Fill bg={INK}>
      <AbsoluteFill style={{transform: `scale(${1 + p * 0.18}) rotate(${(R(`q${f}`) - 0.5) * p * 3}deg)`}}>
        <Rays a={rgba(accent(f), 0.55)} b="transparent" rot={t * t * 0.012} n={24} o={p} />
        <Halftone c={COB} s={22} o={0.6} />
        <Sprite src="05_decor/03_moon" x={540} y={760} w={820} t={`scale(${1 + p * 0.2})`} filter={hard(CYAN, 12)} />
        <Sprite src="05_decor/01_butterfly" x={interpolate(t, [0, d], [-120, 1200])} y={760 + Math.sin(t / 10) * 70} w={300} t={`scaleX(${0.45 + 0.55 * Math.abs(Math.cos(t * 0.4))})`} filter={sil(MAG, 8)} />
        <At y={170}><Ransom text="?" t={t - 10} size={280} seed={`q${Math.floor(t / 8)}`} /></At>
      </AbsoluteFill>
      <Lyric i={k} f={f} y={1420} />
    </Fill>
  );
};

const Showtime: React.FC<P> = ({f, t}) => {
  const e = pop(t, 9, 0.7);
  return (
    <Fill bg={INK}>
      <Rays a={MAG} b={INK} rot={scroll(f) * 1.5} n={16} />
      <AbsoluteFill style={{background: WH, clipPath: `polygon(0 ${72 - e * 20}%, 100% ${52 - e * 20}%, 100% 100%, 0 100%)`}}>
        <Halftone c={CYAN} s={22} dir="to bottom" />
      </AbsoluteFill>
      <Sprite src="04_lighting/01_spotlight" x={160} y={190} w={300} filter={hard(CYAN, 10)} />
      <Sprite src="04_lighting/01_spotlight" x={920} y={190} w={300} t="scaleX(-1)" filter={hard(MAG, 10)} />
      <Sprite src="03_signage/01_jazz_sign" x={540} y={740} w={920} t={`scale(${interpolate(e, [0, 1], [3, 1])}) rotate(${-8 + Math.sin(t / 6) * 3}deg)`} filter={hard(INK, 18)} />
      <At y={1260} rot={-6}><Ransom text="SHOWTIME!" t={t - 8} size={140} seed="show" /></At>
    </Fill>
  );
};

// interlude cut-ins: each band member gets a Persona-style cut-in on a different background
const INSTR = [['01_instruments/01_saxophone', 'SAX'], ['01_instruments/02_trumpet', 'TRUMPET'], ['01_instruments/03_double_bass', 'BASS'], ['01_instruments/04_grand_piano', 'PIANO'], ['01_instruments/05_snare_drum', 'DRUMS']];
const CUT_BG = [
  (t: number, f: number) => <Rays a={MAG} b={INK} rot={scroll(f) * 1.2} n={16} />,
  () => <Fill bg={WH}><Halftone c={CYAN} s={30} dir="to bottom right" /></Fill>,
  (t: number) => <Stripes a={YEL} b={INK} t={t} speed={10} />,
  (t: number) => <Stripes a={WH} b={INK} t={t} w={60} angle={90} speed={-8} />,
  (t: number) => <Fill bg={PUR}><Burst x={540} y={880} r={1100} c={INK} rot={t} seed="dr" n={18} /></Fill>,
];
const CutIn: React.FC<P> = ({f, t, d, k}) => {
  const [src, name] = INSTR[k], dir = k % 2 ? 1 : -1, open = pop(t, 12, 0.6), L = loud(f);
  const slide = (1 - pop(t - 4, 14, 0.8)) * 1300 * dir - (t - d / 2) * 2 * dir;
  return (
    <Fill bg={INK}>
      {CUT_BG[k](t, f)}
      <DownBursts f={f} a={f - t} />
      <div style={{position: 'absolute', left: -300, top: 550, width: W + 600, height: 660, transform: `rotate(${dir * 9}deg) scaleY(${open})`, background: INK, borderTop: `18px solid ${MAG}`, borderBottom: `18px solid ${CYAN}`, overflow: 'hidden'}}>
        <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, transparent 0 22px, rgba(255,255,255,0.08) 22px 26px)'}} />
        <Sprite src={src} x={W / 2 + 300 + slide} y={330} w={820} t={`rotate(${-dir * 9 + Math.sin(f / 7) * 5 * L}deg) scale(${1 + 0.12 * beatPulse(f)})`} filter={hard(MAG, 16)} />
      </div>
      <At y={k % 2 ? 1400 : 150} rot={dir * -6}><Ransom text={name} t={t - 6} size={170} seed={`n${k}`} /></At>
    </Fill>
  );
};

const AllOut: React.FC<P> = ({f, t, d}) => {
  const e = pop(t, 10, 0.8), L = loud(f);
  return (
    <Fill bg={MAG}>
      <Rays a={MAG} b={PUR} rot={scroll(f) * 2} n={20} />
      <Burst x={540} y={820} r={760} c={WH} stroke={INK} rot={t} s={e * (1 + 0.1 * L)} seed="ao" n={16} />
      {INSTR.map(([src], j) => {
        const a = (j / 5) * Math.PI * 2 + t * 0.03;
        return <Sprite key={j} src={src} x={540 + Math.cos(a) * 340 * e} y={820 + Math.sin(a) * 340 * e} w={380} t={`rotate(${Math.cos(a) * 20}deg) scale(${1 + 0.15 * beatPulse(f - j)})`} filter={sil(CYAN, 10)} />;
      })}
      <Sprite src="03_signage/01_jazz_sign" x={540} y={820} w={520} t={`scale(${e * (1 + 0.15 * beatPulse(f))})`} filter={hard(INK, 12)} />
      <At y={1340} rot={-5}><Ransom text="ALL-OUT JAM!" t={t - 10} size={120} seed="ao" /></At>
      <AbsoluteFill style={{background: WH, opacity: interpolate(t, [d - 8, d], [0, 1], CL)}} />
    </Fill>
  );
};

// "A flying butterfly" — awakening: cyan flames, the butterfly emblem tears open
const C8: React.FC<P> = ({f, t, k}) => {
  const L = loud(f), e = pop(t, 9, 0.8);
  return (
    <Fill bg={INK}>
      <Rays a={CYAN} b={COB} rot={scroll(f) * 2} n={18} />
      <Halftone c={INK} s={26} />
      <Rise t={t} c={CYAN} />
      <Sprite src="03_signage/03_butterfly_sign" x={540} y={800} w={1000} t={`scale(${e * (1 + 0.12 * L)}) scaleX(${0.75 + 0.25 * Math.abs(Math.cos(t * 0.3))})`} filter={hard(INK, 20)} />
      <DownBursts f={f} a={f - t} />
      <AbsoluteFill style={{background: WH, opacity: interpolate(t, [0, 10], [0.9, 0], CL)}} />
      <Lyric i={k} f={f} y={1420} />
    </Fill>
  );
};

// "A shining little star" — star supernova with orbiting stars, flash on "star"
const C9: React.FC<P> = ({f, t, k}) => {
  const L = loud(f), kw = kwFrame(k) - (f - t);
  return (
    <Fill bg={PUR}>
      <Rays a={YEL} b={PUR} rot={-scroll(f) * 1.5} n={12} />
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 42%, ${WH} 0%, transparent 35%)`, opacity: 0.6 + 0.4 * L}} />
      {[0, 1, 2, 3, 4].map((j) => {
        const a = (j / 5) * Math.PI * 2 + t * 0.06;
        return <Sprite key={j} src="05_decor/02_little_star" x={540 + Math.cos(a) * 400} y={800 + Math.sin(a) * 400} w={150} t={`rotate(${t * 4}deg) scale(${0.8 + 0.4 * beatPulse(f)})`} filter={hard(INK, 8)} />;
      })}
      <Sprite src="05_decor/02_little_star" x={540} y={800} w={720} t={`rotate(${t * 1.5}deg) scale(${pop(t, 8, 0.6) * (1 + 0.15 * L)})`} filter={hard(INK, 18)} />
      <AbsoluteFill style={{background: WH, opacity: interpolate(t - kw, [0, 2, 10], [0, 0.85, 0], CL)}} />
      <Lyric i={k} f={f} y={1420} rot={4} />
    </Fill>
  );
};

// "As someone who will be my best" — hero pose: crossing stage beams, magenta band slash
const C10: React.FC<P> = ({f, t, k}) => {
  const L = loud(f);
  return (
    <Fill bg={INK}>
      <Halftone c={MAG} s={24} />
      <div style={{position: 'absolute', left: -300, top: 680, width: W + 600, height: 500, background: MAG, transform: `rotate(-12deg) translateX(${(1 - pop(t, 12)) * -1800}px)`}} />
      <div style={{position: 'absolute', left: -300, top: 1190, width: W + 600, height: 40, background: WH, transform: `rotate(-12deg) translateX(${(1 - pop(t - 4, 12)) * 1800}px)`}} />
      <Sprite src="04_lighting/02_light_beam" x={330} y={620} w={1000} t={`rotate(${30 + Math.sin(t / 10) * 12}deg)`} o={0.5 + 0.5 * L} blend />
      <Sprite src="04_lighting/02_light_beam" x={750} y={620} w={1000} t={`scaleX(-1) rotate(${30 + Math.sin(t / 10 + 1) * 12}deg)`} o={0.5 + 0.5 * L} blend />
      <Sprite src="04_lighting/01_spotlight" x={140} y={170} w={260} filter={hard(CYAN, 8)} />
      <Sprite src="04_lighting/01_spotlight" x={940} y={170} w={260} t="scaleX(-1)" filter={hard(CYAN, 8)} />
      <Sprite src="01_instruments/06_microphone" x={540} y={900} w={680} t={`scale(${pop(t, 9, 0.7) * (1 + 0.12 * L)}) rotate(${Math.sin(t / 15) * 5}deg)`} filter={hard(CYAN, 18)} />
      <Lyric i={k} f={f} y={1440} rot={6} />
    </Fill>
  );
};

// "With every flaw" — broken mirror: the butterfly reflected in cracked shards
const C11: React.FC<P> = ({f, t, k}) => {
  const s = t - (kwFrame(k) - (f - t));
  const amt = 8 + (s < 0 ? 0 : Math.min(45, s * 3)) + 12 * beatPulse(f);
  const scene = (
    <Fill bg={WH}>
      <Halftone c={PUR} s={20} dir="to bottom right" o={0.5} />
      <Rays a="rgba(0,229,255,0.25)" b="transparent" rot={t} n={14} />
      <Sprite src="05_decor/01_butterfly" x={540} y={820} w={860} t={`rotate(${Math.sin(t / 20) * 6}deg) scale(${1 + 0.08 * loud(f)})`} filter={hard(INK, 14)} />
    </Fill>
  );
  return (
    <>
      <Fill bg={INK} />
      <Shatter seed="mirror" amt={amt} crack={1} cx={560} cy={760}>{scene}</Shatter>
      <Lyric i={k} f={f} y={1430} />
    </>
  );
};

// "If I have no tomorrow" — Persona calendar: 10/10 SAT flips to 10/11 SUN, then gets slashed
const C12: React.FC<P> = ({f, t, k}) => {
  const kw = kwFrame(k) - (f - t);
  const flip = interpolate(t, [kw - 30, kw - 18], [0, 1], CL), slash = interpolate(t, [kw, kw + 6], [0, 1], CL);
  const next = flip > 0.5, ang = flip < 0.5 ? flip * 180 : (flip - 1) * 180;
  return (
    <Fill bg={`linear-gradient(160deg, ${COB} 0%, ${INK} 70%)`}>
      <Halftone c={CYAN} s={22} dir="to bottom" o={0.4} />
      <Sprite src="05_decor/03_moon" x={780} y={330} w={520} filter={sil(CYAN, 10)} t={`rotate(${t * 0.2}deg) scale(${1 + 0.1 * loud(f)})`} />
      <div style={{position: 'absolute', left: 90, top: 600, transform: `rotate(-8deg) scale(${1 + 0.04 * beatPulse(f)})`}}>
        <div style={{display: 'inline-block', fontFamily: 'Impact', fontSize: 270, lineHeight: 1, color: WH, background: INK, padding: '0 30px', boxShadow: `18px 18px 0 ${MAG}`, transform: `perspective(800px) rotateX(${ang}deg)`}}>{next ? '10/11' : '10/10'}</div>
        <div style={{marginTop: 26, marginLeft: 420, display: 'inline-block', fontFamily: FONT, fontSize: 110, background: slash > 0.5 ? MAG : next ? CYAN : YEL, color: INK, padding: '0 22px', transform: 'rotate(6deg)', boxShadow: `10px 10px 0 ${WH}`}}>
          {slash > 0.5 ? '???' : next ? 'SUN' : 'SAT'}
        </div>
        <div style={{position: 'absolute', left: -60, top: 120, width: 960 * slash, height: 50, background: MAG, transform: 'rotate(-7deg)', boxShadow: `0 0 0 8px ${INK}`}} />
      </div>
      <Lyric i={k} f={f} y={1430} />
    </Fill>
  );
};

// "Then I will have to borrow" — borrowing time: the record rewinds, VHS tracking noise
const C13: React.FC<P> = ({f, t, k}) => {
  const L = loud(f), sec = Math.max(0, (f - t * 6) / FPS);
  return (
    <Fill bg={PUR}>
      <Halftone c={INK} s={24} dir="to bottom" />
      <Sprite src="05_decor/04_vinyl_record" x={540} y={820} w={980} t={`rotate(${-t * 22}deg) scale(${1 + 0.1 * L})`} filter={hard(CYAN, 16)} />
      {[0, 1, 2, 3, 4, 5].map((j) => (
        <div key={j} style={{position: 'absolute', left: 0, top: R(`vh${f}-${j}`) * H, width: W, height: 6 + R(`vg${f}-${j}`) * 40, background: 'rgba(255,255,255,0.25)', transform: `translateX(${(R(`vx${f}-${j}`) - 0.5) * 120}px)`}} />
      ))}
      <div style={{position: 'absolute', left: 70, top: 120, fontFamily: '"Courier New"', fontWeight: 900, fontSize: 96, color: WH, textShadow: `5px 5px 0 ${MAG}`, opacity: Math.floor(t / 8) % 2 ? 1 : 0.35}}>◀◀ REW</div>
      <div style={{position: 'absolute', left: 70, top: 240, fontFamily: '"Courier New"', fontWeight: 900, fontSize: 60, color: YEL}}>
        {`00:${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`}
      </div>
      <Lyric i={k} f={f} y={1430} rot={3} />
    </Fill>
  );
};

// "All those sinful doin'" — the climax: a new asset + new backdrop on every beat
const ALL = [
  '01_instruments/01_saxophone', '05_decor/01_butterfly', '01_instruments/02_trumpet', '03_signage/01_jazz_sign', '01_instruments/03_double_bass', '05_decor/02_little_star',
  '01_instruments/04_grand_piano', '06_fx/03_portal_ring', '01_instruments/05_snare_drum', '05_decor/03_moon', '01_instruments/06_microphone', '03_signage/03_butterfly_sign',
  '02_city/02_jazz_club_building', '04_lighting/01_spotlight', '05_decor/04_vinyl_record', '02_city/01_needle_tower', '04_lighting/03_neon_tube', '03_signage/02_arrow_sign', '02_city/03_rooftop_spire',
];
const C14: React.FC<P> = ({f, t, k}) => {
  const bs = A.beats.filter((b) => b >= f - t && b <= f), n = bs.length, since = n ? f - bs[n - 1] : t, style = n % 5, L = loud(f);
  const light = style === 1 || style === 3;
  const bg = [
    <Rays key="a" a={MAG} b={INK} rot={scroll(f) * 2} n={14} />,
    <Fill key="b" bg={WH}><Halftone c={PUR} s={26} dir="to right" /></Fill>,
    <Stripes key="c" a={YEL} b={INK} t={t} speed={16} angle={135} />,
    <Fill key="d" bg={CYAN}><Burst x={540} y={800} r={900} c={WH} stroke={INK} rot={t * 2} seed={`m${n}`} /></Fill>,
    <Fill key="e" bg={INK}><Rays a={rgba(accent(f), 0.55)} b="transparent" rot={-scroll(f) * 2} n={20} /></Fill>,
  ][style];
  return (
    <Fill bg={INK}>
      {bg}
      <Sprite src={ALL[(n * 7) % ALL.length]} x={540 + (R(`mx${n}`) - 0.5) * 160} y={800} w={820} t={`rotate(${(R(`mr${n}`) - 0.5) * 30}deg) scale(${1.3 - 0.3 * Math.min(1, since / 4) + 0.1 * L})`} filter={light ? sil(MAG, 16) : hard(CYAN, 16)} />
      <AbsoluteFill style={{background: WH, opacity: since < 2 ? 0.35 : 0}} />
      <Lyric i={k} f={f} y={1400} rot={n % 2 ? 4 : -4} seed={String(Math.floor(n / 2))} />
    </Fill>
  );
};

// "Will I even forgiven" — sudden calm: white light, the butterfly rises into the ring
const C15: React.FC<P> = ({f, t, d, k}) => {
  const p = t / d, L = loud(f);
  const by = interpolate(t, [0, d], [1250, 430], CL) + (0.5 - pitch(f)) * 160, bx = 540 + Math.sin(t / 22) * 170;
  return (
    <Fill bg={`radial-gradient(circle at 50% 22%, ${WH} 0%, #f3ecff 40%, #d9c8ff 100%)`}>
      <Halftone c={PUR} s={22} o={0.35} />
      <Rays a="rgba(255,255,255,0.7)" b="transparent" rot={t * 0.6} n={24} y="22%" o={0.6} />
      <Sprite src="06_fx/03_portal_ring" x={540} y={420} w={700} t={`rotate(${t * 1.2}deg) scale(${1 + 0.1 * L})`} />
      {Array.from({length: 8}, (_, j) => (
        <Sprite key={j} src="05_decor/02_little_star" x={R(`fx${j}`) * W} y={((t * (2 + R(`fv${j}`) * 3) + R(`fy${j}`) * H) % H)} w={50 + R(`fw${j}`) * 50} t={`rotate(${t * 2}deg)`} o={0.8} />
      ))}
      <Sprite src="05_decor/01_butterfly" x={bx} y={by} w={340} t={`scaleX(${0.45 + 0.55 * Math.abs(Math.cos(t * 0.35))}) scale(${1 - p * 0.4})`} filter={hard(MAG, 10)} />
      <Lyric i={k} f={f} y={1430} rot={-2} />
      <AbsoluteFill style={{background: WH, opacity: interpolate(t, [d - 14, d], [0, 1], CL)}} />
    </Fill>
  );
};

// wordless final held note — recap tunnel: every key word of the story flies past the camera on the beat,
// the band orbits the butterfly, which grows with the note until the voice stops in a white burst
const RECAP = KEY.filter((w) => w.length > 2).map((w) => w.toUpperCase());
const Finale: React.FC<P> = ({f, t, d}) => {
  const L = loud(f), p = t / d, a0 = f - t;
  const bs = A.beats.filter((b) => b >= a0 && b < a0 + d);
  const c1 = [MAG, CYAN, PUR, YEL][A.downbeats.filter((x) => x >= a0 && x <= f).length % 4];
  return (
    <Fill bg={INK}>
      <Rays a={c1} b={INK} rot={scroll(f) * (2 + p * 4)} n={16} />
      <Halftone c={INK} s={26} />
      <Rise t={t} c={c1 === YEL ? WH : CYAN} n={40} />
      {[...INSTR.map((x) => x[0]), '01_instruments/06_microphone'].map((src, j) => {
        const a = (j / 6) * Math.PI * 2 + t * 0.05, r = 420 + 40 * L;
        return <Sprite key={j} src={src} x={540 + Math.cos(a) * r} y={860 + Math.sin(a) * r * 1.1} w={240} t={`rotate(${Math.cos(a) * 20}deg) scale(${1 + 0.2 * beatPulse(f - j)})`} filter={sil(c1 === CYAN ? MAG : CYAN, 8)} />;
      })}
      {bs.map((b, j) => {
        if (f < b || f >= b + 20) return null;
        const q = (f - b) / 20;
        return (
          <AbsoluteFill key={b} style={{transform: `scale(${0.2 + q * q * 3.2}) rotate(${(R(`tw${j}`) - 0.5) * 40}deg)`, opacity: q < 0.15 ? q / 0.15 : 1 - Math.max(0, (q - 0.5) / 0.5)}}>
            <At y={860}><Ransom text={RECAP[j % RECAP.length]} t={99} size={110} seed={`tun${j}`} /></At>
          </AbsoluteFill>
        );
      })}
      <Sprite src="05_decor/01_butterfly" x={540} y={860 - (pitch(f) - 0.5) * 120} w={420 + 480 * p} t={`scaleX(${0.45 + 0.55 * Math.abs(Math.cos(t * 0.4))}) scale(${1 + 0.15 * L})`} filter={hard(INK, 16)} />
      <DownBursts f={f} a={a0} />
      <AbsoluteFill style={{background: WH, opacity: interpolate(t, [d - 12, d - 2], [0, 1], CL)}} />
    </Fill>
  );
};

const Outro: React.FC<P> = ({t}) => (
  <Fill bg={INK}>
    <Rays a="rgba(255,42,175,0.25)" b="transparent" rot={t} n={20} />
    <Halftone c={CYAN} s={24} o={0.5} />
    <Sprite src="03_signage/03_butterfly_sign" x={540} y={740} w={700} t={`scale(${pop(t, 12, 0.8)})`} filter={hard(MAG, 16)} />
    <At y={1170} rot={-4}><Ransom text="IF I HAVE" t={t} size={88} seed="o1" stagger={1} /></At>
    <At y={1300} rot={3}><Ransom text="NO TOMORROW" t={t - 6} size={88} seed="o2" stagger={1} /></At>
  </Fill>
);

// ---------------- timeline ----------------
const INTER = section('interlude'), CHORUS = section('chorus'), END = A.durationInFrames;
const cut = (i: number) => A.lines[i].start - 6;
const snap = (t: number) => A.downbeats.reduce((p, d) => (Math.abs(d - t) < Math.abs(p - t) ? d : p), t);
const IE = cut(8);
const iseg = [INTER.start, snap(INTER.start + 75)];
for (let j = 1; j <= 5; j++) iseg.push(snap(iseg[1] + ((IE - 100 - iseg[1]) * j) / 5));
iseg.push(IE);

type Sc = {a: number; b: number; C: React.FC<P>; k: number};
const SC: Sc[] = [{a: 0, b: cut(0), C: Intro, k: 0}];
[S0, S1, S2, S3, S4, S5, S6, S7].forEach((C, i) => SC.push({a: cut(i), b: i < 7 ? cut(i + 1) : INTER.start, C, k: i}));
SC.push({a: iseg[0], b: iseg[1], C: Showtime, k: 0});
for (let j = 0; j < 5; j++) SC.push({a: iseg[j + 1], b: iseg[j + 2], C: CutIn, k: j});
SC.push({a: iseg[6], b: iseg[7], C: AllOut, k: 0});
[C8, C9, C10, C11, C12, C13, C14, C15].forEach((C, j) => SC.push({a: cut(8 + j), b: j < 7 ? cut(9 + j) : CHORUS.end, C, k: 8 + j}));
// the last sung word ends well before the voice does: a long held note runs until the audio goes silent
let VOCAL_END = A.loud.length - 1;
while (VOCAL_END > CHORUS.end && A.loud[VOCAL_END] < 0.15) VOCAL_END--;
VOCAL_END += 2;
SC.push({a: CHORUS.end, b: VOCAL_END, C: Finale, k: 0});
SC.push({a: VOCAL_END, b: END + 1, C: Outro, k: 0});
const CUTS = SC.slice(1).map((s) => s.a);

// Persona slash transition: three skewed colour bands sweep across every cut
const WIPES = [[MAG, INK, WH], [CYAN, WH, INK], [YEL, INK, MAG], [PUR, CYAN, INK]];
const Wipe: React.FC<{f: number}> = ({f}) => {
  const j = CUTS.findIndex((c) => f >= c - 8 && f < c + 8);
  if (j < 0) return null;
  const p = (f - (CUTS[j] - 8)) / 16, dir = j % 2 ? 1 : -1;
  return (
    <AbsoluteFill>
      {WIPES[j % 4].map((c, b) => {
        const q = Math.min(1, Math.max(0, p * 1.6 - b * 0.15));
        return <div key={b} style={{position: 'absolute', left: -W, top: -500, width: 3 * W, height: H + 1000, background: c, transform: `translateX(${interpolate(q, [0, 1], [-2.8 * W, 2.8 * W]) * dir}px) skewX(${-18 * dir}deg)`}} />;
      })}
    </AbsoluteFill>
  );
};

const Glitch: React.FC<{f: number}> = ({f}) => {
  const O = onset(f);
  if (O < 0.6 || energy(f) < 0.45) return null;
  return (
    <>
      {[0, 1, 2, 3].map((k) => (
        <div key={k} style={{position: 'absolute', left: (R(`gx${f}-${k}`) - 0.5) * 200, top: R(`gy${f}-${k}`) * H, width: W, height: 4 + R(`gh${f}-${k}`) * 26, background: k % 2 ? MAG : CYAN, opacity: 0.45 * O, mixBlendMode: 'screen'}} />
      ))}
    </>
  );
};

export const MV: React.FC = () => {
  const f = useCurrentFrame();
  const s = SC.find((x) => f >= x.a && f < x.b) ?? SC[SC.length - 1];
  const sh = onset(f) * energy(f) * 18;
  const zoom = 1.05 + 0.025 * beatPulse(f) + 0.04 * downPulse(f) * (f > CHORUS.start ? 1 : 0.4);
  const tilt = (R(`tilt${s.a}`) - 0.5) * 4;
  return (
    <AbsoluteFill style={{background: INK, overflow: 'hidden'}}>
      <Html5Audio src={staticFile('song.mp3')} />
      <AbsoluteFill style={{transform: `translate(${(R(`sx${f}`) - 0.5) * sh}px, ${(R(`sy${f}`) - 0.5) * sh}px) rotate(${tilt}deg) scale(${zoom})`}}>
        <s.C f={f} t={f - s.a} d={s.b - s.a} k={s.k} />
      </AbsoluteFill>
      <Glitch f={f} />
      <Wipe f={f} />
      <AbsoluteFill style={{background: INK, opacity: Math.max(interpolate(f, [0, 12], [1, 0], CL), interpolate(f, [END - 15, END - 1], [0, 1], CL))}} />
    </AbsoluteFill>
  );
};
