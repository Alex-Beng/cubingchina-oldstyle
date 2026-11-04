# -*- coding: utf-8 -*-
"""全片时间轴。

场景顺序、切点、字幕与音效落点都由这一份表驱动。
场景长度 = 起播偏移 + 该句配音时长 + 尾部余量，向上取整到 1 秒。
改台词后重跑 svtts.py，这里自动跟着变。
"""
from __future__ import annotations

import json
import math
import os

FPS = 30
VOICE = os.environ.get("VOICE", "barbara")
HERE = os.path.dirname(os.path.abspath(__file__))

# 场景顺序（与 scenes.py 的运镜脚本同名）
ORDER = [
    "newui",
    "title",
    "home",
    "competition",
    "results",
    "rankings",
    "records",
    "person",
    "static",
    "outro",
]

# 场景 -> (配音起播偏移, 句末余量)
LEAD = {
    "newui": (0.7, 0.9),
    "title": (0.9, 0.9),
    "home": (0.5, 0.8),
    "competition": (0.4, 0.7),
    "results": (0.4, 0.7),
    "rankings": (0.4, 0.7),
    "records": (0.4, 0.7),
    "person": (0.5, 0.9),
    "static": (0.6, 1.0),
    "outro": (0.8, 1.4),
}

_MISSING = {"dur": 6.0, "text": ""}


def _vo_table(voice: str) -> dict:
    p = os.path.join(HERE, f"vo_{voice}.json")
    if not os.path.exists(p):
        return {}
    with open(p, encoding="utf-8") as f:
        data = json.load(f)
    return {o["id"]: o for o in data["lines"]}


VO = {}
VOICE_META = {}
_SCENES = []


def _round_up(x: float) -> float:
    return max(1.0, math.ceil(x - 1e-9))


def build() -> None:
    global VO, VOICE_META
    VOICE_META = _vo_table(VOICE)
    VO = {}
    _SCENES.clear()
    t = 0.0
    for name in ORDER:
        v = VOICE_META.get(name, _MISSING)
        lead, tail = LEAD.get(name, (0.6, 0.8))
        length = _round_up(lead + float(v["dur"]) + tail)
        _SCENES.append((round(t, 6), round(t + length, 6), name))
        VO[name] = (round(t + lead, 3), round(t + lead + float(v["dur"]), 3))
        t += length


def scene_at(t: float) -> tuple[str, float, float]:
    """返回 (场景名, 场景内时间, 场景时长)"""
    for a, b, name in _SCENES:
        if a <= t < b:
            return name, t - a, b - a
    a, b, name = _SCENES[-1]
    return name, t - a, b - a


def scene_bounds(name: str) -> tuple[float, float]:
    for a, b, n in _SCENES:
        if n == name:
            return a, b
    raise KeyError(name)


def scenes() -> list[tuple[float, float, str]]:
    return list(_SCENES)


def duration() -> float:
    return _SCENES[-1][1] if _SCENES else 0.0


# ---------------- 音效落点 ----------------
# 每场按比例摆几拍；最后一个场景只放收尾
_BEATS = {
    "newui": [(0.10, "whoosh"), (0.55, "pop")],
    "title": [(0.10, "impact"), (0.55, "pop")],
    "home": [(0.10, "whoosh"), (0.55, "pop")],
    "competition": [(0.10, "pop"), (0.55, "pop")],
    "results": [(0.10, "pop"), (0.55, "pop")],
    "rankings": [(0.10, "pop"), (0.55, "pop")],
    "records": [(0.10, "pop"), (0.55, "pop")],
    "person": [(0.10, "whoosh"), (0.55, "pop")],
    "static": [(0.12, "impact"), (0.55, "pop")],
    "outro": [(0.30, "impact"), (0.68, "pop")],
}

# 字幕：每场一句，按标点切成短片段
_SUB = {}


def _split(text: str) -> list[str]:
    out, buf = [], ""
    for ch in text:
        buf += ch
        if ch in "，。？；：—、" and len(buf) >= 6:
            out.append(buf.rstrip("，。？；：、—"))
            buf = ""
    if buf.strip():
        out.append(buf.strip())
    return [s for s in out if s]


def build_subs() -> list[tuple[float, float, str]]:
    """返回 [(start, end, text)]"""
    subs = []
    for a, b, name in _SCENES:
        v = VOICE_META.get(name)
        if not v:
            continue
        lead = LEAD.get(name, (0.6, 0.8))[0]
        t0 = a + lead
        d_all = float(v["dur"])
        frags = _split(v["text"])
        if not frags:
            continue
        tot = sum(len(f) for f in frags) or 1
        cur = t0
        for f in frags:
            d = d_all * len(f) / tot
            subs.append((round(cur, 3), round(cur + d, 3), f))
            cur += d
    return subs


def hits() -> list[tuple[float, str]]:
    out = []
    for a, b, name in _SCENES:
        L = b - a
        for u, k in _BEATS.get(name, []):
            out.append((round(a + u * L, 3), k))
    return [(t, k) for t, k in out if t < duration() - 0.2]


# 模块导入即构建，保持与参考工程一致的使用方式
if "--no-build" not in os.environ.get("TIMELINE_INIT", ""):
    build()


if __name__ == "__main__":
    build()
    print(f"DUR {duration():.2f}s  frames {int(duration() * FPS)}")
    for a, b, n in _SCENES:
        print(f"  {a:7.2f} -> {b:7.2f}  ({b - a:5.1f}s)  {n}")
