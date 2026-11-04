# 旧版粗饼网 · 功能导览短片

用 Playwright 驱动线上真实站点，逐帧运镜截取，叠加旁白字幕与标注，最终由 ffmpeg 封装成片。

画面里的一切都来自**真实运行的网页**，没有截图、没有手绘化。

## 依赖

```bash
pip install pycairo numpy
npm i -D playwright          # 或使用全局 npx playwright
npx playwright install chromium
```

另需系统级 `ffmpeg` / `ffprobe` 在 PATH 中。

## 旁白

`svtts.py` 约定本地 TTS 服务：

```
POST http://localhost:8001/tts
Body: {"text": "<台词>", "voice": "barbara"}
返回: RIFF/WAV 字节流
```

跑通后执行：

```bash
python svtts.py
```

生成 `vo/barbara/*.wav` 与 `vo_barbara.json`。时间轴据此自动计算场景时长。

## 构建

```bash
python build.py                     # render -> music -> mux
python build.py --skip-render       # 复用已渲染帧
python render.py 0 120              # 只渲染某段帧（快速预览）
python render.py --stills           # 每个场景各导 2 张关键帧到 out/stills/
```

产物：`out/cubingchina_oldstyle.mp4`。

## 目录

| 文件 | 作用 |
| --- | --- |
| `capture.mjs` | Playwright 驱动：打开路由、等待就绪、运镜、逐帧导出 |
| `camera.py` | 运镜关键帧与插值 |
| `overlay.py` | 叠层绘制：标题条、字幕条、标注框、进度条 |
| `compose.py` | 网页帧 + 叠层合成 |
| `timeline.py` | 全片时间轴，场景时长由配音时长推导 |
| `narration.py` | 台词表 |
| `svtts.py` | 调用本地 TTS 生成旁白 |
| `scenes.py` | 每场运镜脚本 |
| `render.py` | 分段并行渲染 |
| `music.py` | numpy 合成配乐与音效 |
| `mux.py` | 混音、响度归一、封装 |
| `build.py` | 一键串联 |

## 说明

站点数据实时来自线上 API，成片因此带有录制当天的数据快照。
重跑会得到当天的最新数据，画面结构不变，数字会随线上而变。
