#!/usr/bin/env python3
"""Generate a neutral, single-play 2000ms GIF and its static WebP poster."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 480, 600
DURATIONS_MS = [250] * 8
BG = (250, 250, 250)
INK = (40, 40, 40)
RULE = (124, 124, 124)
LINE_WIDTHS = [1, 16, 36, 59, 83, 104, 124, 142]
MESSAGE = "초대합니다"
OUT = Path(os.environ.get("INVITATION_INTRO_OUTPUT", "public/assets/invitation-intro"))
OUT.mkdir(parents=True, exist_ok=True)


def locate_font() -> str:
    candidates = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJKkr-Regular.otf",
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
        "/usr/share/fonts/truetype/nanum/NanumBarunGothic.ttf",
    ]
    for path in candidates:
        if Path(path).is_file():
            return path
    result = subprocess.run(["fc-match", "-f", "%{file}", "Noto Sans CJK KR"],
                            check=True, capture_output=True, text=True)
    path = result.stdout.strip()
    if not path or not Path(path).is_file():
        raise RuntimeError("Korean font unavailable; install fonts-noto-cjk")
    return path


FONT = ImageFont.truetype(locate_font(), 46)


def frame(line_width: int) -> Image.Image:
    im = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(im)
    bounds = draw.textbbox((0, 0), MESSAGE, font=FONT)
    tx = (WIDTH - (bounds[2] - bounds[0])) // 2 - bounds[0]
    ty = 251 - bounds[1]
    draw.text((tx, ty), MESSAGE, fill=INK, font=FONT)
    x0 = (WIDTH - line_width) // 2
    draw.rectangle((x0, 345, x0 + max(line_width, 1) - 1, 346), fill=RULE)
    return im


images = [frame(width) for width in LINE_WIDTHS]
frames = [
    img.quantize(colors=32, method=Image.Quantize.MEDIANCUT,
                 dither=Image.Dither.NONE)
    for img in images
]
gif_path = OUT / "universal-2s.gif"
frames[0].save(gif_path, format="GIF", save_all=True,
               append_images=frames[1:], duration=DURATIONS_MS,
               optimize=True, disposal=2,
               comment=b"Universal invitation intro: 2000ms, one play")
poster_path = OUT / "poster.webp"
images[-1].save(poster_path, "WEBP", quality=92, method=6)

with Image.open(gif_path) as gif:
    duration = 0
    for i in range(gif.n_frames):
        gif.seek(i)
        duration += gif.info.get("duration", 0)
    assert gif.n_frames == 8, f"Expected 8 frames, got {gif.n_frames}"
    assert duration == 2000, f"Expected exactly 2000ms, got {duration}"
    assert gif.size == (WIDTH, HEIGHT)
    assert gif.info.get("loop") is None, "GIF must play once"

manifest = {
    "task": "INTRO-GIF-01",
    "scene": "Neutral invitation typography: Korean title and one straight line",
    "event_agnostic": True,
    "wedding_or_event_specific_symbols": False,
    "fps": 4,
    "frames": 8,
    "durations_ms": DURATIONS_MS,
    "total_duration_ms": 2000,
    "loop": False,
    "width": WIDTH,
    "height": HEIGHT,
    "background": "#FAFAFA",
    "ink": "#282828",
    "files": {
        path.name: {
            "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()
        } for path in (gif_path, poster_path)
    },
    "notes": "Asset only. Integration and legacy removal are separate tasks."
}
(OUT / "manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8")
print(json.dumps(manifest, ensure_ascii=False, indent=2))
