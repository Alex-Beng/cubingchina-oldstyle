# -*- coding: utf-8 -*-
"""全代码合成配乐 + 音效。

结构完全由 timeline 推出：每个场景占一段，转场处落 impact / whoosh / pop。
基调是轻快的电子木琴 + 柔和铺底，不抢旁白。
"""
from __future__ import annotations

import os
import wave

import numpy as np

import timeline as TL

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", f"music_{TL.VOICE}.wav")

SR = 48000
BPM = 108.0
BEAT = 60.0 / BPM
BAR = BEAT * 4
DUR = TL.duration()
N = int(SR * DUR) + SR // 2
rng = np.random.default_rng(20261104)


def midi(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12.0)


def env_exp(n: int, tau: float) -> np.ndarray:
    return np.exp(-np.arange(n) / (SR * tau))


def adsr(n: int, a=0.006, d=0.06, s=0.65, r=0.10) -> np.ndarray:
    env = np.ones(n, dtype=np.float64)
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    a_n = min(a_n, n)
    d_n = min(d_n, max(0, n - a_n))
    r_n = min(r_n, n)
    if a_n > 0:
        env[:a_n] = np.linspace(0, 1, a_n)
    if d_n > 0:
        env[a_n:a_n + d_n] = np.linspace(1, s, d_n)
    env[a_n + d_n:] = s
    if r_n > 0:
        env[-r_n:] *= np.linspace(1, 0, r_n)
    return env


def marimba(freq: float, dur: float, vol=0.3) -> np.ndarray:
    n = max(2, int(dur * SR))
    t = np.arange(n) / SR
    base = np.sin(2 * np.pi * freq * t) * 1.0
    o2 = np.sin(2 * np.pi * freq * 4.0 * t) * 0.16
    y = (base + o2) * env_exp(n, dur * 0.32)
    return y * vol


def tri(freq: float, dur: float, vol=0.22, slide=1.0) -> np.ndarray:
    n = max(2, int(dur * SR))
    f = freq * np.linspace(1.0, slide, n)
    ph = np.cumsum(f) / SR
    y = 2 * np.abs(2 * (ph % 1.0) - 1) - 1
    return y * adsr(n) * vol


def pad(freq: float, dur: float, vol=0.06) -> np.ndarray:
    n = max(2, int(dur * SR))
    t = np.arange(n) / SR
    y = (np.sin(2 * np.pi * freq * t) * 0.6
         + np.sin(2 * np.pi * freq * 1.005 * t) * 0.4
         + np.sin(2 * np.pi * freq * 0.5 * t) * 0.3)
    env = adsr(n, a=0.35, d=0.6, s=0.8, r=0.9)
    return y * env * vol


def add(buf: np.ndarray, y: np.ndarray, at: float, gain=1.0) -> None:
    i0 = int(at * SR)
    if i0 < 0 or i0 >= len(buf):
        return
    n = min(len(y), len(buf) - i0)
    buf[i0:i0 + n] += y[:n] * gain


# ---------------- 音效 ----------------
def fx_impact(dur=0.5) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 110 * np.exp(-t * 7.0)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR)
    noise = rng.standard_normal(n) * np.exp(-t * 30.0) * 0.25
    return (body * np.exp(-t * 9.0) + noise) * 0.9


def fx_whoosh(dur=0.55) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # 简易带通：差分做高频、累积做低频，中间取和
    hp = np.diff(noise, prepend=noise[0])
    env = np.hanning(n)
    return (noise * 0.4 + hp * 0.6) * env * 0.22


def fx_pop(dur=0.16) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 620 * np.exp(t * 9.0)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return y * np.exp(-t * 26.0) * 0.5


# ---------------- 编曲 ----------------
def main() -> None:
    buf = np.zeros(N, dtype=np.float64)

    # 和弦进行（每小节一个）：C - G - Am - F，用 MIDI 音高
    prog = [
        [48, 55, 60, 64],
        [43, 50, 55, 59],
        [45, 52, 57, 60],
        [41, 48, 53, 57],
    ]

    # 铺底：整片一层缓慢和弦
    n_bars = int(np.ceil(DUR / BAR))
    for b in range(n_bars):
        t0 = b * BAR
        chord = prog[b % len(prog)]
        for m in chord[:3]:
            add(buf, pad(midi(m), BAR * 1.02, 0.045), t0, 1.0)

    # 主旋律：五声音阶随机游走，每拍一到两个音
    scale = [72, 74, 76, 79, 81, 84, 86]     # C 大调五声
    pos = 3
    for b in range(n_bars):
        for k in range(4):
            if b < 2 and k < 2:
                continue
            t0 = b * BAR + k * BEAT
            if t0 > DUR - 0.5:
                break
            step = rng.integers(-1, 2)
            pos = max(0, min(len(scale) - 1, pos + int(step)))
            note = scale[pos]
            add(buf, marimba(midi(note), BEAT * 0.9, 0.16), t0, 1.0)
            if k == 2:
                add(buf, marimba(midi(scale[max(0, pos - 2)]), BEAT * 1.2, 0.12),
                    t0 + BEAT * 0.5, 1.0)

    # 低音：每小节根音
    for b in range(n_bars):
        t0 = b * BAR
        add(buf, tri(midi(prog[b % len(prog)][0] - 12), BEAT * 1.8, 0.16), t0, 1.0)
        add(buf, tri(midi(prog[b % len(prog)][0] - 12), BEAT * 1.2, 0.11),
            t0 + BAR * 0.5, 1.0)

    # 音效落点
    for t, kind in TL.hits():
        if kind == "impact":
            add(buf, fx_impact(), t, 0.85)
        elif kind == "whoosh":
            add(buf, fx_whoosh(), t - 0.12, 0.8)
        else:
            add(buf, fx_pop(), t, 0.7)

    # 首尾淡入淡出
    fade_in = int(0.6 * SR)
    fade_out = int(1.4 * SR)
    buf[:fade_in] *= np.linspace(0, 1, fade_in)
    buf[-fade_out:] *= np.linspace(1, 0, fade_out)

    # 归一化到较高峰值（mux 里还要与旁白混音、并被 duck 压低）
    peak = float(np.max(np.abs(buf))) or 1.0
    buf *= 0.72 / peak

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    pcm = (np.clip(buf, -1, 1) * 32767).astype("<i2")
    with wave.open(OUT, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())

    print(f"music: {DUR:.1f}s -> {OUT}")


if __name__ == "__main__":
    main()
