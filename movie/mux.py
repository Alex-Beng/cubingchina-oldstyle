# -*- coding: utf-8 -*-
"""把成片帧 + 配乐 + 旁白封装成 mp4。

旁白位置来自 timeline.VO（每场的起播时刻），配乐做旁白闪避。
两遍 loudnorm 把整体响度对齐到 -16 LUFS。
"""
from __future__ import annotations

import json
import os
import subprocess
import wave

import numpy as np

import timeline as TL

HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.environ.get("FRAMES") or os.path.join(HERE, "out", "frames")
OUT = os.path.join(HERE, "out", "cubingchina_oldstyle.mp4")
MIX = os.path.join(HERE, "out", "_mix.wav")
SR = 48000


def read_wav(path: str) -> tuple[np.ndarray, int]:
    with wave.open(path, "rb") as w:
        nch, sw, sr = w.getnchannels(), w.getsampwidth(), w.getframerate()
        raw = w.readframes(w.getnframes())
    assert sw == 2, path
    a = np.frombuffer(raw, dtype="<i2").astype(np.float64) / 32768.0
    if nch > 1:
        a = a.reshape(-1, nch).mean(axis=1)
    return a, sr


def resample(a: np.ndarray, sr_from: int, sr_to: int) -> np.ndarray:
    if sr_from == sr_to:
        return a
    n = int(round(len(a) * sr_to / sr_from))
    x = np.arange(n) * (sr_from / sr_to)
    return np.interp(x, np.arange(len(a)), a)


def main() -> None:
    N = int(round(TL.duration() * SR)) + SR

    # ---- 旁白轨 ----
    voice = np.zeros(N, dtype=np.float64)
    vo_json = os.path.join(HERE, f"vo_{TL.VOICE}.json")
    with open(vo_json, encoding="utf-8") as f:
        vtbl = {o["id"]: o for o in json.load(f)["lines"]}

    for name, (t0, _t1) in TL.VO.items():
        entry = vtbl.get(name)
        if not entry:
            continue
        p = entry["file"]
        if not os.path.isabs(p):
            p = os.path.join(HERE, p)
        if not os.path.exists(p):
            print(f"  跳过缺失的旁白: {p}")
            continue
        a, sr = read_wav(p)
        a = resample(a, sr, SR)
        f = int(0.012 * SR)
        if len(a) > 2 * f:
            a[:f] *= np.linspace(0, 1, f)
            a[-f:] *= np.linspace(1, 0, f)
        i0 = int(t0 * SR)
        n = min(len(a), N - i0)
        voice[i0:i0 + n] += a[:n]

    # 语音响度对齐
    sp = voice[np.abs(voice) > 0.02]
    rms = float(np.sqrt(np.mean(sp ** 2))) if len(sp) else 1.0
    voice *= 0.055 / max(1e-6, rms)
    vp = float(np.max(np.abs(voice))) or 1.0
    if vp > 0.92:
        voice *= 0.92 / vp
    print(f"voice RMS {rms:.4f} -> 对齐；峰值 {vp:.2f}")

    # ---- 配乐轨 ----
    music_path = os.path.join(HERE, "out", f"music_{TL.VOICE}.wav")
    mus, msr = read_wav(music_path)
    mus = resample(mus, msr, SR)
    music = np.zeros(N)
    n = min(len(mus), N)
    music[:n] = mus[:n]

    # ---- 闪避 ----
    env = np.abs(voice)
    k = int(0.12 * SR)
    env = np.convolve(env, np.ones(k) / k, mode="same")
    gate = np.clip(env * 26.0, 0.0, 1.0)
    duck = 1.0 - 0.32 * gate
    music *= duck

    mix = music * 1.05 + voice * 1.55
    peak = float(np.max(np.abs(mix))) or 1.0
    mix *= 0.708 / peak

    st = np.stack([mix, mix], axis=1)
    pcm = (np.clip(st, -1, 1) * 32767).astype("<i2")
    os.makedirs(os.path.dirname(MIX), exist_ok=True)
    with wave.open(MIX, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())

    print(f"{TL.VOICE}: {TL.duration():.1f}s  mix peak {np.max(np.abs(mix)):.2f}")

    # ---- 两遍 loudnorm ----
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", MIX,
         "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
         "-f", "null", "NUL"],
        capture_output=True, text=True,
    )
    txt = r.stderr
    i0 = txt.rfind("{")
    j = json.loads(txt[i0:txt.rfind("}") + 1]) if i0 >= 0 else {}
    ln = (
        "loudnorm=I=-16:TP=-1.5:LRA=11:"
        f"measured_I={j.get('input_i', '-16')}:measured_TP={j.get('input_tp', '-1.5')}:"
        f"measured_LRA={j.get('input_lra', '11')}:measured_thresh={j.get('input_thresh', '-26')}:"
        f"offset={j.get('target_offset', '0')}:linear=true"
    )
    print("loudnorm:", j.get("input_i"), "LUFS -> -16")

    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-framerate", "30", "-i", os.path.join(FRAMES, "%05d.png"),
         "-i", MIX,
         "-c:v", "libx264", "-preset", "medium", "-crf", "18",
         "-pix_fmt", "yuv420p", "-t", f"{TL.duration():.3f}",
         "-af", ln,
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-movflags", "+faststart", OUT],
        check=True,
    )
    size = os.path.getsize(OUT) // 1024
    print(f"wrote {OUT}  {size} KB")


if __name__ == "__main__":
    main()
