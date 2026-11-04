# -*- coding: utf-8 -*-
"""生成旁白。

优先尝试本地 TTS 服务（约定 POST /tts {"text","voice"} 返回 RIFF/WAV）；
不可用时回退到 edge-tts。两条路都产出 16bit 单声道 WAV 与 vo_<voice>.json。

用法：
    python svtts.py                 # 默认 voice=barbara
    python svtts.py --force-edge    # 跳过本地服务，直接用 edge-tts
    TTS_BASE=http://localhost:8001 python svtts.py

voice 到实际音色的映射见 VOICE_MAP；本地服务直接透传 voice 字段，
edge-tts 走 VOICE_MAP 里的 edge 音色名。
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import wave

from narration import LINES

HERE = os.path.dirname(os.path.abspath(__file__))
TTS_BASE = os.environ.get("TTS_BASE", "http://localhost:8001").rstrip("/")

# 逻辑音色 -> edge-tts 音色
VOICE_MAP = {
    "barbara": "zh-CN-XiaoyiNeural",
    "hanabi": "zh-CN-XiaoxiaoNeural",
}
DEFAULT_VOICE = "barbara"
RATE = "+4%"


def ffprobe_dur(path: str) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        capture_output=True, text=True,
    )
    return float(r.stdout.strip())


def to_wav(src: str, dst: str) -> None:
    """统一转 48k 单声道 16bit WAV。"""
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", src,
         "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", dst],
        check=True,
    )


def try_local(text: str, voice: str, timeout: float = 300.0) -> bytes | None:
    """调本地 /tts。服务不存在或超时就返回 None，交给 edge-tts。

    本地服务首次合成会加载模型、偶尔返回 500（TTS failed）；
    这里对 500 做有限重试，避免一次抖动就整体回退。
    """
    last_err = None
    for attempt in range(3):
        body = json.dumps({"text": text, "voice": voice}, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            TTS_BASE + "/tts",
            data=body,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
                if r.status == 200 and data[:4] == b"RIFF":
                    return data
                return None
        except urllib.error.HTTPError as e:
            if e.code >= 500:
                last_err = e
                time.sleep(2.0 + attempt * 2.0)
                continue
            return None
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError):
            return None
    return None


def edge_tts(text: str, voice: str, dst_mp3: str) -> None:
    edge_voice = VOICE_MAP.get(voice, VOICE_MAP[DEFAULT_VOICE])
    subprocess.run(
        [sys.executable, "-m", "edge_tts", "--voice", edge_voice,
         "--rate", RATE, "--text", text, "--write-media", dst_mp3],
        check=True,
    )


def main() -> None:
    voice = DEFAULT_VOICE
    force_edge = "--force-edge" in sys.argv
    for a in sys.argv[1:]:
        if not a.startswith("--"):
            voice = a

    outdir = os.path.join(HERE, "vo", voice)
    os.makedirs(outdir, exist_ok=True)

    lines = []
    tmpdir = tempfile.mkdtemp(prefix="svtts_")
    local_ok = False if force_edge else None
    t_all = time.time()

    # 预热：服务刚启动时首个请求可能 500，先打一发再判断可用性
    if local_ok is None:
        warm = try_local("预热", voice)
        if warm is not None:
            local_ok = True
            print(f"  本地 TTS 可用（{TTS_BASE}），全部走本地")
        else:
            local_ok = False
            print(f"  本地 TTS 不可用（{TTS_BASE}），回退 edge-tts")

    for idx, (tag, text) in enumerate(LINES, 1):
        wav_path = os.path.join(outdir, f"{tag}.wav")
        mode = ""

        body = try_local(text, voice) if local_ok else None

        if body is not None:
            raw = os.path.join(tmpdir, f"{tag}.wav")
            with open(raw, "wb") as f:
                f.write(body)
            to_wav(raw, wav_path)
            mode = "local"
        else:
            raw = os.path.join(tmpdir, f"{tag}.mp3")
            edge_tts(text, voice, raw)
            to_wav(raw, wav_path)
            mode = "edge"

        dur = ffprobe_dur(wav_path)
        rel = os.path.relpath(wav_path, HERE).replace("\\", "/")
        lines.append({"id": tag, "text": text, "dur": round(dur, 3), "file": rel})
        print(f"  [{idx:2d}/{len(LINES)}] {tag:12s} {dur:6.2f}s  {mode}")

    shutil.rmtree(tmpdir, ignore_errors=True)

    table = {
        "voice": voice,
        "engine": "local" if local_ok else "edge-tts",
        "lines": lines,
    }
    out_json = os.path.join(HERE, f"vo_{voice}.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(table, f, ensure_ascii=False, indent=1)

    total = sum(o["dur"] for o in lines)
    print(f"\n{voice}: {len(lines)} 条，合计 {total:.2f}s -> {os.path.basename(out_json)}"
          f"（{time.time() - t_all:.1f}s）")


if __name__ == "__main__":
    main()
