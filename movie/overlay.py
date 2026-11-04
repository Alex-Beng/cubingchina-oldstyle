# -*- coding: utf-8 -*-
"""叠层绘制：标题条、字幕条、标注框、引线、进度条、开场与收尾卡。

设计基调是「干净还原」：细线、留白、低对比遮罩，不使用纸纹与手绘抖动。
所有函数都接收一个 alpha（0..1）用于淡入淡出。
"""
from __future__ import annotations

import math

import cairo

W, H = 1920, 1080
M = 96                      # 左右安全边

FONT = "Microsoft YaHei"

# 旧站主色（取自站点 theme-color）
BLUE = (0.376, 0.569, 0.729)       # #6091ba
BLUE_D = (0.231, 0.365, 0.478)
INK = (0.129, 0.145, 0.165)
INK_SOFT = (0.400, 0.427, 0.463)
WHITE = (1.0, 1.0, 1.0)
GOLD = (0.831, 0.627, 0.090)


def clamp(v, lo=0.0, hi=1.0):
    return lo if v < lo else (hi if v > hi else v)


def seg(t, a, b):
    if b <= a:
        return 1.0 if t >= b else 0.0
    return clamp((t - a) / (b - a))


def ease_out(t, p=3.0):
    t = clamp(t)
    return 1.0 - (1.0 - t) ** p


def ease_io(t):
    t = clamp(t)
    return t * t * (3.0 - 2.0 * t)


def set_font(ctx, size, bold=True):
    ctx.select_font_face(
        FONT,
        cairo.FONT_SLANT_NORMAL,
        cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL,
    )
    ctx.set_font_size(size)


def text_w(ctx, s, size, bold=True, spacing=0.0):
    set_font(ctx, size, bold)
    return ctx.text_extents(s)[4] + spacing * max(0, len(s) - 1)


def draw_text(ctx, s, x, y, size, color=INK, bold=True, align="left",
              alpha=1.0, spacing=0.0, shadow=False):
    if alpha <= 0.004 or not s:
        return 0.0
    set_font(ctx, size, bold)
    if spacing == 0.0:
        w = ctx.text_extents(s)[4]
    else:
        w = sum(ctx.text_extents(ch)[4] for ch in s) + spacing * (len(s) - 1)
    if align == "center":
        x -= w / 2
    elif align == "right":
        x -= w

    def _emit(dx=0.0, dy=0.0):
        ctx.new_path()
        if spacing == 0.0:
            ctx.move_to(x + dx, y + dy)
            ctx.text_path(s)
        else:
            cx = x + dx
            for ch in s:
                ctx.move_to(cx, y + dy)
                ctx.text_path(ch)
                cx += ctx.text_extents(ch)[4] + spacing

    if shadow:
        _emit(0, 2)
        ctx.set_source_rgba(0, 0, 0, 0.28 * alpha)
        ctx.fill()
    _emit()
    ctx.set_source_rgba(*color, alpha)
    ctx.fill()
    return w


def round_rect(ctx, x, y, w, h, r):
    ctx.new_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    ctx.close_path()


# ---------------- 标题条 ----------------
def title_block(ctx, kicker, line1, line2=None, a=1.0, x=M, y=112,
                size=62, c2=BLUE, c1=INK):
    """左上角标题区：小标 + 主标题 + 副标题，从上往下轻微位移淡入。"""
    if a <= 0.004:
        return
    dy = (1 - ease_out(a, 3)) * -22
    if kicker:
        draw_text(ctx, kicker, x, y - 40 + dy, 24, INK_SOFT, bold=True,
                  alpha=a * 0.95, spacing=2.0)
    draw_text(ctx, line1, x, y + 30 + dy, size, c1, alpha=a)
    if line2:
        draw_text(ctx, line2, x, y + 30 + size * 1.22 + dy, size * 0.72, c2, alpha=a)
    # 主标题左边一道竖线，呼应「还原」的克制冷感
    ctx.set_line_width(5)
    ctx.set_source_rgba(*BLUE, 0.85 * a)
    ctx.move_to(x - 26, y - 26 + dy)
    ctx.line_to(x - 26, y - 26 + dy + (size * 0.9 if not line2 else size * 1.7))
    ctx.stroke()


# ---------------- 字幕条 ----------------
SUB_Y = H - 96
SUB_SIZE = 40


def subtitle(ctx, s, a=1.0):
    """底部居中字幕：半透明深底胶囊 + 白字，保证任何页面背景上都可读。"""
    if not s or a <= 0.004:
        return
    a = clamp(a)
    pad_x, pad_y = 34, 22
    tw = text_w(ctx, s, SUB_SIZE)
    bw = tw + pad_x * 2
    bh = SUB_SIZE + pad_y * 2
    bx = W / 2 - bw / 2
    by = SUB_Y - SUB_SIZE - pad_y

    sc = 0.94 + 0.06 * ease_out(a, 3)
    ctx.save()
    ctx.translate(W / 2, by + bh / 2)
    ctx.scale(sc, sc)
    ctx.translate(-W / 2, -(by + bh / 2))

    round_rect(ctx, bx, by, bw, bh, bh / 2)
    ctx.set_source_rgba(0.07, 0.08, 0.10, 0.76 * a)
    ctx.fill()

    draw_text(ctx, s, W / 2, SUB_Y, SUB_SIZE, WHITE, bold=False,
              align="center", alpha=a)
    ctx.restore()


# ---------------- 标注：框 / 引线 / 圆点 ----------------
def highlight_box(ctx, x, y, w, h, a=1.0, color=BLUE, width=4.0, radius=10):
    """细线高亮框（画一圈描边，可叠加淡底）。"""
    if a <= 0.004:
        return
    round_rect(ctx, x, y, w, h, radius)
    ctx.set_source_rgba(*color, 0.13 * a)
    ctx.fill_preserve()
    ctx.set_line_width(width)
    ctx.set_source_rgba(*color, 0.95 * a)
    ctx.stroke()


def callout(ctx, x, y, text, a=1.0, color=BLUE, size=30, anchor="left", bg=True):
    """带底色的小标签（用于指着页面某处说话）。"""
    if a <= 0.004 or not text:
        return
    tw = text_w(ctx, text, size)
    pad_x, pad_y = 18, 12
    bw, bh = tw + pad_x * 2, size + pad_y * 2 - 6
    bx = x - pad_x if anchor == "left" else (x - bw + pad_x if anchor == "right" else x - bw / 2)
    by = y - size + 8 - pad_y

    sc = 0.9 + 0.1 * ease_out(a, 3)
    ctx.save()
    ctx.translate(bx + bw / 2, by + bh / 2)
    ctx.scale(sc, sc)
    ctx.translate(-(bx + bw / 2), -(by + bh / 2))
    if bg:
        round_rect(ctx, bx, by, bw, bh, 8)
        ctx.set_source_rgba(*color, 0.95 * a)
        ctx.fill()
    draw_text(ctx, text, bx + pad_x, y, size,
              WHITE if bg else color, align="left", alpha=a)
    ctx.restore()


def pointer(ctx, x1, y1, x2, y2, a=1.0, color=BLUE, width=3.0, head=14):
    """从标注指向目标的细线 + 箭头。"""
    if a <= 0.004:
        return
    ctx.set_line_width(width)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_source_rgba(*color, 0.9 * a)
    ctx.move_to(x1, y1)
    ctx.line_to(x2, y2)
    ctx.stroke()
    ang = math.atan2(y2 - y1, x2 - x1)
    for sgn in (-0.5, 0.5):
        ctx.move_to(x2, y2)
        ctx.line_to(x2 - math.cos(ang + sgn) * head, y2 - math.sin(ang + sgn) * head)
    ctx.stroke()


def dot(ctx, x, y, r, a=1.0, color=BLUE, ring=True):
    if a <= 0.004:
        return
    ctx.new_path()
    ctx.arc(x, y, r, 0, 2 * math.pi)
    ctx.set_source_rgba(*color, 0.95 * a)
    ctx.fill()
    if ring:
        ctx.new_path()
        ctx.arc(x, y, r * 2.1, 0, 2 * math.pi)
        ctx.set_line_width(2.4)
        ctx.set_source_rgba(*color, 0.35 * a)
        ctx.stroke()


# ---------------- 进度条 ----------------
def progress(ctx, t, dur, a=1.0):
    y = H - 26
    bar_w = W - M * 2
    ctx.set_line_width(2)
    ctx.set_source_rgba(1, 1, 1, 0.30 * a)
    ctx.move_to(M, y)
    ctx.line_to(M + bar_w, y)
    ctx.stroke()

    ctx.set_source_rgba(1, 1, 1, 0.22 * a)
    ctx.rectangle(M, y - 2, bar_w, 4)
    ctx.fill()

    ctx.set_source_rgba(*WHITE, 0.85 * a)
    ctx.rectangle(M, y - 2, bar_w * clamp(t / dur), 4)
    ctx.fill()


# ---------------- 场景切换：顶部渐变遮罩 ----------------
def top_scrim(ctx, a=1.0, h=340):
    """顶部压暗，让标题在任意页面上都可读。"""
    if a <= 0.004:
        return
    g = cairo.LinearGradient(0, 0, 0, h)
    g.add_color_stop_rgba(0.0, 0.05, 0.06, 0.08, 0.58 * a)
    g.add_color_stop_rgba(0.55, 0.05, 0.06, 0.08, 0.22 * a)
    g.add_color_stop_rgba(1.0, 0.05, 0.06, 0.08, 0.0)
    ctx.set_source(g)
    ctx.rectangle(0, 0, W, h)
    ctx.fill()


def bottom_scrim(ctx, a=1.0, h=260):
    if a <= 0.004:
        return
    g = cairo.LinearGradient(0, H - h, 0, H)
    g.add_color_stop_rgba(0.0, 0.05, 0.06, 0.08, 0.0)
    g.add_color_stop_rgba(1.0, 0.05, 0.06, 0.08, 0.62 * a)
    ctx.set_source(g)
    ctx.rectangle(0, H - h, W, h)
    ctx.fill()


# ---------------- 开场卡 ----------------
def intro_card(ctx, a=1.0, kicker="CUBINGCHINA · OLD STYLE",
               title="旧版粗饼网", sub="第三方复刻站 · 功能导览"):
    """全屏片头卡。必须不透明：底层网页此时可能已加载，透出去会和文字打架。"""
    if a <= 0.004:
        return
    ctx.set_source_rgba(0.055, 0.075, 0.105, clamp(a))
    ctx.rectangle(0, 0, W, H)
    ctx.fill()

    # 装饰线放在主标题上方，避免横穿文字
    ctx.set_source_rgba(*BLUE, 0.9 * a)
    ctx.rectangle(W / 2 - 300, H / 2 - 62, 600, 3)
    ctx.fill()

    draw_text(ctx, kicker, W / 2, H / 2 - 150, 28, BLUE, align="center",
              alpha=a * 0.95, spacing=8.0)
    draw_text(ctx, title, W / 2, H / 2 + 30, 128, WHITE, align="center", alpha=a)
    draw_text(ctx, sub, W / 2, H / 2 + 110, 36, (0.78, 0.82, 0.88), bold=False,
              align="center", alpha=a)


def outro_card(ctx, a=1.0, title="旧版粗饼网复刻站",
               url="alex-beng.github.io/cubingchina-oldstyle",
               note="只读 · 纯静态 · 数据实时"):
    if a <= 0.004:
        return
    ctx.set_source_rgba(0.055, 0.075, 0.105, clamp(a))
    ctx.rectangle(0, 0, W, H)
    ctx.fill()

    draw_text(ctx, title, W / 2, H / 2 - 90, 92, WHITE, align="center", alpha=a)

    ctx.set_line_width(3)
    ctx.set_source_rgba(*BLUE, 0.9 * a)
    ctx.move_to(W / 2 - 320, H / 2 - 34)
    ctx.line_to(W / 2 + 320, H / 2 - 34)
    ctx.stroke()

    draw_text(ctx, url, W / 2, H / 2 + 60, 44, BLUE, bold=False, align="center", alpha=a)
    draw_text(ctx, note, W / 2, H / 2 + 132, 28, (0.72, 0.76, 0.82), bold=False,
              align="center", alpha=a, spacing=3.0)
