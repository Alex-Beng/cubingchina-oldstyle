# -*- coding: utf-8 -*-
"""一键重建整部短片。

流水线：
    1. 渲染    render.py  -> out/frames/NNNNN.png
    2. 配乐    music.py   -> out/music_<voice>.wav
    3. 封装    mux.py     -> out/cubingchina_oldstyle.mp4

用法：
    python build.py                  # 全流程
    python build.py --skip-render    # 复用已有帧，只重做音轨 + 封装
    python build.py --skip-audio     # 帧已就绪且音轨不动，只封装

前置：vo_<voice>.json 与旁白 wav 已由 svtts.py 生成；ffmpeg 在 PATH。
"""
from __future__ import annotations

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def run(script: str, args=None):
    args = args or []
    cmd = [sys.executable, os.path.join(HERE, script)] + args
    print("\n>>> " + " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True, cwd=HERE)


def main() -> None:
    flags = {a for a in sys.argv[1:] if a.startswith("--")}

    if "--skip-render" not in flags:
        run("render.py")
    else:
        print("[skip] render")

    if "--skip-audio" not in flags:
        run("music.py")

    run("mux.py")
    print(f"\n完成：{os.path.join(HERE, 'out', 'cubingchina_oldstyle.mp4')}")


if __name__ == "__main__":
    main()
