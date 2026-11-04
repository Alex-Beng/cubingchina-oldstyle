# -*- coding: utf-8 -*-
"""渲染整部片子。

分两段，避免 Playwright 与 pycairo 抢资源：

  1. 抓帧：按场景生成运镜计划，交给 capture.mjs 逐帧导出网页画面（JPEG）
  2. 合成：Pillow 读入 JPEG → 转 cairo 画布 → 画叠层 → 输出成片帧（PNG）

用法：
    python render.py                # 全片
    python render.py 0 300          # 只渲某段帧
    python render.py --stills       # 每场导 2 张关键帧到 out/stills/
"""
from __future__ import annotations

import json
import math
import os
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor

import cairo
from PIL import Image

import timeline as TL
from overlay import W, H, progress, subtitle
from scenes import base_of, overlay_for, shot_for, top_pad

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("FRAMES") or os.path.join(HERE, "out", "frames")
RAW = os.path.join(HERE, "out", "raw")
VOICE = os.environ.get("VOICE", "barbara")

_SUBS_CACHE = None
_KEEPALIVE = []


def _ceil(x: float) -> int:
    return math.ceil(x - 1e-9)


# ---------------------------------------------------------------- 抓帧

def _plan(frame_range=None):
    lo, hi = frame_range if frame_range else (0, None)
    plans = {}
    for name in TL.ORDER:
        s0, s1 = TL.scene_bounds(name)
        dur = s1 - s0
        shot = shot_for(name, dur)
        f_first = _ceil(s0 * TL.FPS)
        f_last = _ceil(s1 * TL.FPS)
        if hi is not None:
            f_first = max(f_first, lo)
            f_last = min(f_last, hi)
        if f_last <= f_first:
            continue
        frames = []
        for i in range(f_first, f_last):
            sc, x, y, scroll = shot.at(i / TL.FPS - s0)
            frames.append({
                "i": i,
                "scale": round(sc, 5),
                "x": round(x, 2),
                "y": round(y, 2),
                "scroll": round(scroll, 2),
            })
        if not frames:
            continue
        # 同一路由+同一 base 才能合并成一批
        b = base_of(name)
        key = f"{b or ''}|{shot.route}"
        entry = plans.setdefault(
            key, {"route": shot.route, "topPad": top_pad(name), "frames": []})
        if b:
            entry["base"] = b
        entry["frames"].extend(frames)
    # 按帧号排序，Playwright 顺序写盘更友好
    for e in plans.values():
        e["frames"].sort(key=lambda f: f["i"])
    return list(plans.values())


def run_capture(frame_range=None, raw_dir=None):
    raw_dir = raw_dir or RAW
    os.makedirs(raw_dir, exist_ok=True)
    # 清掉旧帧，避免参数变更后残留脏图
    for fn in os.listdir(raw_dir):
        if fn.endswith((".jpg", ".png")) and fn[0].isdigit():
            os.remove(os.path.join(raw_dir, fn))
    shots = _plan(frame_range)
    if not shots:
        print("[capture] 没有需要抓的帧")
        return
    total = sum(len(s["frames"]) for s in shots)
    plan = {
        "base": "https://alex-beng.github.io/cubingchina-oldstyle/",
        "outDir": raw_dir.replace("\\", "/"),
        "width": W,
        "height": H,
        "dpr": 2,
        "quality": 92,
        "concurrency": 2,
        "parallelPages": 4,
        "shots": shots,
    }
    plan_path = os.path.join(HERE, "out", "plan.json")
    with open(plan_path, "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False)

    print(f"[capture] {total} 帧，{len(shots)} 个批次")
    t0 = time.time()
    script = os.path.join(HERE, "capture.mjs")
    r = subprocess.run(["node", script, "--plan", plan_path], cwd=HERE)
    if r.returncode != 0:
        raise SystemExit("capture.mjs 失败，中止")
    print(f"[capture] 完成 {time.time() - t0:.0f}s")


# ---------------------------------------------------------------- 合成

def _load_jpeg_as_surface(path: str) -> cairo.ImageSurface:
    im = Image.open(path).convert("RGB")
    if im.size != (W, H):
        im = im.resize((W, H), Image.LANCZOS)
    w, h = im.size
    stride = cairo.ImageSurface.format_stride_for_width(cairo.FORMAT_RGB24, w)
    raw = bytearray(im.tobytes("raw", "BGRX"))
    if stride != w * 4:
        pad = b"\x00" * (stride - w * 4)
        buf = bytearray()
        row = w * 4
        for y in range(h):
            buf += raw[y * row:(y + 1) * row]
            buf += pad
        raw = buf
    surf = cairo.ImageSurface.create_for_data(
        memoryview(raw), cairo.FORMAT_RGB24, w, h, stride)
    # surface 直接引用这块内存，必须在 surface 使用期间保持存活
    _KEEPALIVE.append(raw)
    if len(_KEEPALIVE) > 4:
        del _KEEPALIVE[:-4]
    return surf


def _draw_subs(ctx, t):
    if not _SUBS_CACHE:
        return
    for s0, s1, txt in _SUBS_CACHE:
        if s0 - 0.02 <= t < s1:
            a = min(1.0, (t - s0) / 0.12, (s1 - t) / 0.10)
            subtitle(ctx, txt, max(0.0, min(1.0, a)))
            break


def compose_frame(i: int, raw_dir: str | None = None, out_dir: str | None = None) -> bool:
    raw_dir = raw_dir or RAW
    out_dir = out_dir or OUT
    raw_path = os.path.join(raw_dir, f"{i:05d}.jpg")
    if not os.path.exists(raw_path):
        return False

    t = i / TL.FPS
    name, t_local, dur = TL.scene_at(t)

    src = _load_jpeg_as_surface(raw_path)

    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surface)
    ctx.set_source_surface(src, 0, 0)
    ctx.paint()

    overlay_for(name, ctx, t_local, dur)
    _draw_subs(ctx, t)
    progress(ctx, t, TL.duration(), 1.0)

    os.makedirs(out_dir, exist_ok=True)
    surface.write_to_png(os.path.join(out_dir, f"{i:05d}.png"))
    return True


def _compose_worker(args):
    i, raw_dir, out_dir = args
    global _SUBS_CACHE
    if _SUBS_CACHE is None:
        _SUBS_CACHE = TL.build_subs()
    return compose_frame(i, raw_dir, out_dir)


def run_compose(frame_range=None):
    global _SUBS_CACHE
    _SUBS_CACHE = TL.build_subs()
    total = int(round(TL.duration() * TL.FPS))
    lo, hi = frame_range if frame_range else (0, total)
    hi = min(hi, total)
    idx = [i for i in range(lo, hi) if os.path.exists(os.path.join(RAW, f"{i:05d}.jpg"))]
    if not idx:
        print("[compose] 没有可合成的帧")
        return

    t0 = time.time()
    nproc = max(1, min(8, (os.cpu_count() or 4)))
    done = 0
    with ProcessPoolExecutor(max_workers=nproc) as ex:
        for ok in ex.map(_compose_worker, [(i, RAW, OUT) for i in idx], chunksize=16):
            done += 1
            if done % 300 == 0:
                print(f"  compose {done}/{len(idx)}  {time.time() - t0:.0f}s", flush=True)
    print(f"[compose] {done} 帧 -> {OUT}（{time.time() - t0:.0f}s）")


def run_stills():
    stills = os.path.join(HERE, "out", "stills")
    os.makedirs(stills, exist_ok=True)
    picks = []
    for name in TL.ORDER:
        s0, s1 = TL.scene_bounds(name)
        dur = s1 - s0
        for u in (0.35, 0.8):
            picks.append((name, int((s0 + dur * u) * TL.FPS)))
    idx = sorted({p[1] for p in picks})
    frame_range = (idx[0], idx[-1] + 1)

    raw_stills = os.path.join(HERE, "out", "raw_stills")
    run_capture(frame_range, raw_dir=raw_stills)

    global _SUBS_CACHE
    _SUBS_CACHE = TL.build_subs()
    for name, i in picks:
        compose_frame(i, raw_dir=raw_stills, out_dir=stills)
        src = os.path.join(stills, f"{i:05d}.png")
        if os.path.exists(src):
            os.replace(src, os.path.join(stills, f"{name}_{i:05d}.png"))
    print(f"[stills] -> {stills}")


def main():
    args = sys.argv[1:]
    if "--stills" in args:
        run_stills()
        return
    fr = None
    nums = [a for a in args if a.replace("-", "").isdigit()]
    if len(nums) >= 2:
        fr = (int(nums[0]), int(nums[1]))
    run_capture(fr)
    run_compose(fr)


if __name__ == "__main__":
    main()
