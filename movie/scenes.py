# -*- coding: utf-8 -*-
"""每个场景的运镜与叠层。

一个场景 = 一个路由 + 一组运镜关键帧 + 若干叠层事件。

约定：
  * 页面在抓帧时会被 `topPad` 向下推，顶部留出 HERO 高度的干净横带，
    叠层标题只写在横带内，永远不会压到网页元素。
  * 叠层中的坐标全部是「最终画面」的屏幕坐标（1920×1080）。
  * 运镜关键帧时间以「场景内秒数」书写，渲染时按实际场景时长等比拉伸。
"""
from __future__ import annotations

import math

import cairo

from camera import Key, Shot
from overlay import (
    W, H, M, BLUE, BLUE_D, GOLD, INK, INK_SOFT, WHITE,
    bottom_scrim, callout, dot, draw_text, ease_io, ease_out, highlight_box,
    intro_card, outro_card, pointer, round_rect, seg, subtitle, title_block, top_scrim,
)

BASE = "https://alex-beng.github.io/cubingchina-oldstyle/"
NEW_BASE = "https://cubing.com/"

# 顶部标题带高度：页面内容会被推到这条线以下
HERO = 210
# 内容区（真实站点实测）
CX = 190
CW = 1540


# ============================================================
# 场景定义表
# ============================================================
SHOTS = {
    # 00 新版：先让人看到现在的样子，靠运镜把卡片区扫一遍
    "newui": dict(
        route="", base=NEW_BASE, src_dur=9.0, top=0,
        keys=[
            Key(0.0, 1.00, 0, 0, 0),
            Key(3.0, 1.08, -60, -60, 0),
            Key(9.0, 1.12, -90, -110, 60),
        ],
    ),
    # 01 片头：首页由远及近
    "title": dict(
        route="#/", src_dur=9.0, top=HERO,
        keys=[
            Key(0.0, 0.80, 120, 70, 0),
            Key(4.5, 0.92, 40, 25, 0),
            Key(9.0, 1.00, 0, 0, 0),
        ],
    ),
    # 02 只读 / 纯静态 / 实时数据：缓慢下移
    "intro": dict(
        route="#/", src_dur=9.0, top=HERO,
        keys=[
            Key(0.0, 1.00, 0, 0, 0),
            Key(9.0, 1.00, 0, 0, 150),
        ],
    ),
    # 03 首页：移向右栏「近期赛事」（2.2s 前已到位，标注才对得准）
    "home": dict(
        route="#/", src_dur=8.0, top=HERO,
        keys=[
            Key(0.0, 1.00, 0, 0, 0),
            Key(2.2, 1.14, -300, -20, 0),
            Key(8.0, 1.16, -320, 0, 0),
        ],
    ),
    # 04 赛事：先停在筛选区，再缓慢下滚浏览列表，最后回到顶部
    "competition": dict(
        route="#/competition", src_dur=9.0, top=HERO,
        keys=[
            Key(0.0, 1.00, 0, 0, 0),
            Key(3.0, 1.00, 0, 0, 0),
            Key(6.0, 1.00, 0, 0, 640),
            Key(9.0, 1.00, 0, 0, 640),
        ],
    ),
    # 05 成绩中心：五入口
    "results": dict(
        route="#/results", src_dur=9.0, top=HERO,
        keys=[
            Key(0.0, 1.00, 0, 0, 0),
            Key(9.0, 1.05, -40, -20, 40),
        ],
    ),
    # 06 排名：下滚到榜单，前三行高亮（标注出现时保持 1.0 缩放，坐标才准）
    "rankings": dict(
        route="#/results/rankings", src_dur=9.0, top=HERO,
        keys=[
            Key(0.0, 1.00, 0, 0, 60),
            Key(3.2, 1.00, 0, 0, 470),
            Key(9.0, 1.00, 0, 0, 470),
        ],
    ),
    # 07 纪录：下滚到三阶 WR 行停在内容区中部（scroll≈380 → WR 行 y≈300）
    "records": dict(
        route="#/results/records", src_dur=8.0, top=HERO,
        keys=[
            Key(0.0, 1.00, 0, 0, 120),
            Key(4.0, 1.00, 0, 0, 380),
            Key(8.0, 1.00, 0, 0, 380),
        ],
    ),
    # 08 选手页：耿暄一（标注出现时保持 1.0 缩放）
    "person": dict(
        route="#/results/person/2023GENG02", src_dur=9.0, top=HERO,
        keys=[
            Key(0.0, 1.00, 0, 0, 0),
            Key(2.8, 1.00, 0, 0, 400),
            Key(9.0, 1.00, 0, 0, 400),
        ],
    ),
    # 09 纯静态：页面压暗，讲 Hash 路由
    "static": dict(
        route="#/", src_dur=10.0, top=HERO,
        keys=[
            Key(0.0, 1.06, -220, -40, 0),
            Key(10.0, 1.10, -240, -60, 20),
        ],
    ),
    # 10 收尾：拉远
    "outro": dict(
        route="#/", src_dur=8.0, top=HERO,
        keys=[
            Key(0.0, 1.14, -180, -40, 0),
            Key(8.0, 0.92, 60, 40, 0),
        ],
    ),
}


def shot_for(name: str, scene_dur: float) -> Shot:
    d = SHOTS[name]
    scale = max(1e-6, scene_dur) / d["src_dur"]
    keys = tuple(Key(k.t * scale, k.scale, k.x, k.y, k.scroll) for k in d["keys"])
    return Shot(d["route"], keys, "io")


def top_pad(name: str) -> int:
    return SHOTS[name].get("top", 0)


def base_of(name: str) -> str | None:
    """批次专属 base；None 表示用全局默认（旧版站）。"""
    return SHOTS[name].get("base")


# ============================================================
# 叠层
# ============================================================

def overlay_for(name: str, ctx: cairo.Context, t: float, dur: float):
    fn = _OVERLAYS.get(name)
    if fn:
        fn(ctx, t, dur)


def _hero_bar(ctx, a=1.0, h=HERO):
    """顶部标题带：实色深底 + 下缘一条高光细线。

    必须是不透明的：网页被 topPad 推到下方后，运镜上滚时页面元素会从
    标题带底下经过，实色才能干净地把它挡住。
    """
    if a <= 0.004:
        return
    ctx.set_source_rgba(0.055, 0.075, 0.105, a)
    ctx.rectangle(0, 0, W, h)
    ctx.fill()

    ctx.set_line_width(2)
    ctx.set_source_rgba(*BLUE, 0.55 * a)
    ctx.move_to(0, h - 1)
    ctx.line_to(W, h - 1)
    ctx.stroke()


def _hero_title(ctx, kicker, line, accent=None, a=1.0):
    """标题带内的标题：小标 + 主标题（可选强调色副串）。"""
    if a <= 0.004:
        return
    dy = (1 - ease_out(a, 3)) * -18
    x = 88
    if kicker:
        draw_text(ctx, kicker, x, 58 + dy, 22, BLUE, alpha=a * 0.95, spacing=2.2)
    size = 56
    w = draw_text(ctx, line, x, 132 + dy, size, WHITE, alpha=a)
    if accent:
        draw_text(ctx, accent, x + w + 20, 132 + dy, size, BLUE, alpha=a)


def _o_newui(ctx, t, dur):
    """新版站：只在顶部压一条很矮的浅色带写标题，尽量少遮挡界面。"""
    a = seg(t, 0.2, 0.8)
    if a <= 0.004:
        return
    g = cairo.LinearGradient(0, 0, 0, 118)
    g.add_color_stop_rgba(0.0, 0.055, 0.075, 0.105, 0.88 * a)
    g.add_color_stop_rgba(1.0, 0.055, 0.075, 0.105, 0.0)
    ctx.set_source(g)
    ctx.rectangle(0, 0, W, 118)
    ctx.fill()

    draw_text(ctx, "现在的粗饼网", 88, 46, 20, BLUE, alpha=a * 0.95, spacing=2.2)
    draw_text(ctx, "圆角 · 渐变 · 彩色标签", 88, 88, 32, WHITE, alpha=a)

    b = seg(t, 1.0, 1.7)
    if b > 0:
        callout(ctx, W - 88, 60, "新版 UI", b, (0.85, 0.45, 0.15), 24, anchor="right")


def _o_title(ctx, t, dur):
    # 黑底卡淡出
    a = 1.0 - ease_out(seg(t, 1.8, 3.6), 2.2)
    if a > 0.004:
        intro_card(ctx, a)
    # 露出后铺标题带
    hb = seg(t, 2.8, 3.8)
    if hb > 0.004:
        _hero_bar(ctx, hb)
        _hero_title(ctx, "CUBINGCHINA · OLD STYLE", "旧版粗饼网", "功能导览", seg(t, 3.0, 3.9))
        draw_text(ctx, "一个只读、纯静态的第三方复刻站", 88, 176, 26,
                  (0.72, 0.77, 0.84), bold=False, alpha=seg(t, 3.4, 4.2))


def _o_home(ctx, t, dur):
    _hero_bar(ctx, 1.0)
    _hero_title(ctx, "02 / 首页", "赛事资讯", "和即将开始的比赛", seg(t, 0.15, 0.9))


def _o_competition(ctx, t, dur):
    _hero_bar(ctx, 1.0)
    _hero_title(ctx, "03 / 赛事", "筛选到报名", "详情 · 赛程 · 规则 · 交通", seg(t, 0.15, 0.9))
    # 前 3 秒列表停在筛选区，标签贴在筛选栏左侧留白
    a = seg(t, 0.6, 1.3) * (1.0 - seg(t, 2.6, 3.2))
    if a > 0:
        for i, label in enumerate(["按年份", "按项目", "按省份"]):
            callout(ctx, 12, 300 + i * 66, label, a * (1.0 - i * 0.10), BLUE, 26)


def _o_results(ctx, t, dur):
    _hero_bar(ctx, 1.0)
    _hero_title(ctx, "04 / 成绩中心", "五个入口", "选手 · 赛事 · 排名 · 纪录 · 统计",
                seg(t, 0.15, 0.9))


def _o_rankings(ctx, t, dur):
    _hero_bar(ctx, 1.0)
    _hero_title(ctx, "05 / 排名", "分级查询", "三阶中国第一 2.51s", seg(t, 0.15, 0.9))
    # 实测：表头 y=203，前三行 235/268/301，行高 33 → 框 y=203 h=131
    a = seg(t, 4.0, 4.9)
    if a > 0:
        highlight_box(ctx, CX + 4, 203, CW - 8, 131, a, BLUE, 3.5, 6)
        callout(ctx, CX + 22, 192, "前三名", a, BLUE, 22)


def _o_records(ctx, t, dur):
    _hero_bar(ctx, 1.0)
    _hero_title(ctx, "06 / 纪录", "中国 · 亚洲 · 世界", "谁在哪里破了什么", seg(t, 0.15, 0.9))
    a = seg(t, 3.4, 4.3)
    if a > 0:
        # scroll=380 时三阶 WR 首行 y≈300，平均行 y≈331，二阶 WR y≈396
        highlight_box(ctx, CX + 4, 300, CW - 8, 128, a, GOLD, 3.0, 6)
        callout(ctx, CX + 22, 289, "WR 世界纪录", a, GOLD, 22)


def _o_person(ctx, t, dur):
    _hero_bar(ctx, 1.0)
    _hero_title(ctx, "07 / 选手主页", "耿暄一 Xuanyi Geng", "WCA ID 2023GENG02",
                seg(t, 0.15, 0.9))
    # 实测：个人最好成绩表 y=328 h=201（含表头 + 5 行）
    a = seg(t, 2.6, 3.4)
    if a > 0:
        highlight_box(ctx, CX + 2, 328, CW - 4, 201, a, BLUE, 3.5, 8)
        callout(ctx, CX + 22, 317, "个人最好成绩", a, BLUE, 22)


def _o_static(ctx, t, dur):
    # 整屏压暗，专讲 Hash 路由
    ctx.set_source_rgba(0.055, 0.075, 0.105, 0.94)
    ctx.rectangle(0, 0, W, H)
    ctx.fill()

    draw_text(ctx, "08 / 为什么能纯静态", 88, 108, 26, BLUE, alpha=0.95, spacing=2.2)
    draw_text(ctx, "页面全在井号后面", 88, 186, 64, WHITE)
    draw_text(ctx, "一个 index.html + 一份静态资源，托管在任何 CDN 上，无需服务端。",
              88, 240, 28, (0.72, 0.77, 0.84), bold=False)

    bar_x, bar_y, bar_w = 88, 300, W - 176
    entries = [
        ("#/", "首页"),
        ("#/competition", "赛事列表"),
        ("#/results/rankings", "排名"),
        ("#/results/person/2023GENG02", "选手主页"),
    ]
    row_h = 128
    for i, (route, label) in enumerate(entries):
        a = seg(t, 0.9 + i * 0.55, 1.4 + i * 0.55)
        if a <= 0:
            continue
        y = bar_y + i * row_h
        # 行底
        ctx.new_path()
        rr = 12
        x0, y0, x1, y1 = bar_x, y, bar_x + bar_w, y + row_h - 22
        ctx.arc(x1 - rr, y0 + rr, rr, -math.pi / 2, 0)
        ctx.arc(x1 - rr, y1 - rr, rr, 0, math.pi / 2)
        ctx.arc(x0 + rr, y1 - rr, rr, math.pi / 2, math.pi)
        ctx.arc(x0 + rr, y0 + rr, rr, math.pi, 1.5 * math.pi)
        ctx.close_path()
        ctx.set_source_rgba(1, 1, 1, 0.09 * a)
        ctx.fill()

        draw_text(ctx, route, bar_x + 40, y + 68, 38,
                  BLUE if i % 2 == 0 else (0.92, 0.94, 0.97), bold=True, alpha=a)
        draw_text(ctx, "→ " + label, bar_x + bar_w - 40, y + 66, 26,
                  (0.72, 0.77, 0.84), bold=False, align="right", alpha=a)


def _o_outro(ctx, t, dur):
    """结尾分两段：先把旧站首页压暗，浮现主旨两句并长时间停留；最后切到地址卡。"""
    d = 0.82 * ease_out(seg(t, 0.0, 1.4), 2.2)
    if d > 0.004:
        ctx.set_source_rgba(0.055, 0.075, 0.105, d)
        ctx.rectangle(0, 0, W, H)
        ctx.fill()

    # 主旨两句（B 版），一直停在画面上，直到地址卡盖住它
    card_t0 = max(2.0, dur - 4.4)
    lines = [
        ("新的更快、更亮、更像未来", WHITE, 0.9),
        ("旧的更慢、更钝、更像记忆", (0.80, 0.84, 0.90), 2.3),
    ]
    for i, (text, col, t0) in enumerate(lines):
        a = seg(t, t0, t0 + 0.8)
        if a <= 0.004:
            continue
        dy = (1 - ease_out(seg(t, t0, t0 + 0.8), 3)) * 22
        draw_text(ctx, text, W / 2, H / 2 - 20 + i * 78 + dy,
                  52, col, align="center", alpha=a)

    # 末段：全屏地址卡淡入
    b = ease_out(seg(t, card_t0, card_t0 + 1.4), 2.2)
    if b > 0.004:
        outro_card(ctx, b)


_OVERLAYS = {
    "newui": _o_newui,
    "title": _o_title,
    "home": _o_home,
    "competition": _o_competition,
    "results": _o_results,
    "rankings": _o_rankings,
    "records": _o_records,
    "person": _o_person,
    "static": _o_static,
    "outro": _o_outro,
}
