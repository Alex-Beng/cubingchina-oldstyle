# -*- coding: utf-8 -*-
"""运镜描述与插值。

一个镜头（shot）描述「在某个路由上，从什么时候到什么时候，镜头怎么动」。

镜头由若干关键帧组成：

    Key(t, scale, x, y, scroll)

    t      场景内时间（秒）
    scale  缩放（1.0 = 视觉像素等于 CSS 像素）
    x, y   平移（CSS 像素，正数向右/向下）
    scroll 页面纵向滚动位置（CSS 像素）

任意时刻取相邻两帧插值。scale/x/y 走 ease-in-out，scroll 同为缓动，
这样镜头推拉与页面滚动不会打架。
"""
from __future__ import annotations

import math
from dataclasses import dataclass


def clamp(v, lo=0.0, hi=1.0):
    return lo if v < lo else (hi if v > hi else v)


def ease_io(t):
    t = clamp(t)
    return t * t * (3.0 - 2.0 * t)


def ease_out(t, p=3.0):
    t = clamp(t)
    return 1.0 - (1.0 - t) ** p


def ease_in_out_quint(t):
    t = clamp(t)
    return 16 * t ** 5 if t < 0.5 else 1 - (-2 * t + 2) ** 5 / 2


@dataclass(frozen=True)
class Key:
    t: float
    scale: float = 1.0
    x: float = 0.0
    y: float = 0.0
    scroll: float = 0.0


@dataclass(frozen=True)
class Shot:
    """一个镜头段：route 上的 [t0, t1) 时间窗，镜头按 keys 运动。"""

    route: str
    keys: tuple
    ease: str = "io"

    def at(self, t_local: float) -> tuple[float, float, float, float]:
        """返回 (scale, x, y, scroll)"""
        ks = self.keys
        if t_local <= ks[0].t:
            k = ks[0]
            return k.scale, k.x, k.y, k.scroll
        if t_local >= ks[-1].t:
            k = ks[-1]
            return k.scale, k.x, k.y, k.scroll
        for a, b in zip(ks, ks[1:]):
            if a.t <= t_local <= b.t:
                span = b.t - a.t
                u = 0.0 if span <= 0 else (t_local - a.t) / span
                if self.ease == "io":
                    e = ease_io(u)
                elif self.ease == "quint":
                    e = ease_in_out_quint(u)
                elif self.ease == "out":
                    e = ease_out(u, 3.0)
                elif self.ease == "lin":
                    e = clamp(u)
                else:
                    e = ease_io(u)
                return (
                    a.scale + (b.scale - a.scale) * e,
                    a.x + (b.x - a.x) * e,
                    a.y + (b.y - a.y) * e,
                    a.scroll + (b.scroll - a.scroll) * e,
                )
        k = ks[-1]
        return k.scale, k.x, k.y, k.scroll


def transform_css(scale: float, x: float, y: float) -> str:
    """把镜头状态转成可注入页面 body 的 transform。

    注意顺序：先 translate 再 scale，等价于以左上角为原点缩放后整体平移，
    与 camera.Key 的语义一致（x/y 是最终屏幕上的像素位移）。
    """
    return f"translate({x:.3f}px,{y:.3f}px) scale({scale:.5f})"


def norm_keys(keys, scene_dur: float, src_dur: float):
    """把以「场景内秒数」写死的关键帧，重映射到实际场景时长。

    台词变长/变短时，运镜节奏等比拉伸，画面结构不变形。
    """
    k = max(1e-6, scene_dur) / max(1e-6, src_dur)
    return tuple(
        Key(key.t * k, key.scale, key.x, key.y, key.scroll)
        for key in keys
    )
