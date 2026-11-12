#!/usr/bin/env python3
"""Read-only browser capture of the existing public Invitation intro preview.

Captures rendered animation frames; does not authenticate, write Firebase data,
change application source, or deploy.
"""
import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps
from playwright.sync_api import sync_playwright

BASE_URL = os.getenv("INVITATION_INTRO_BASE_URL", "https://invite.msgnote.kr").rstrip("/")
OUTPUT = Path("artifacts/invitation-intro-0a")
OUTPUT.mkdir(parents=True, exist_ok=True)
VIEWPORTS = {
    "mobile-390": {"width": 390, "height": 844, "scale": 2, "is_mobile": True},
    "desktop-1440": {"width": 1440, "height": 900, "scale": 1, "is_mobile": False},
}
STYLES = ("light", "cinema", "envelope")
PHASES = {
    "light": [("start", .08), ("text-enter", .90), ("text-hold", 1.90), ("wipe", 2.85), ("end", 4.25)],
    "cinema": [("start", .08), ("shutter-open", .58), ("text-hold", 1.75), ("handoff", 3.30), ("end", 4.75)],
    "envelope": [("closed", .10), ("before-tap", .90), ("after-tap", .45), ("letter-rise", 1.45), ("handoff", 2.55), ("end", 4.10)],
}
report = {
    "project": "hebi10/invitation",
    "phase": "0-A baseline intro visual QA",
    "capture_time_utc": datetime.now(timezone.utc).isoformat(),
    "source": "deployed app preview route (not a customer wedding page)",
    "source_base_url": BASE_URL,
    "uses_test_persona_only": True,
    "connectToCover": False,
    "styles": list(STYLES),
    "viewports": VIEWPORTS,
    "cases": [],
    "limitations": ["Preview uses sample names and photo.", "Preview connectToCover=false: cannot verify destination-cover image handoff.", "Chromium emulation is not physical Android or iPhone."],
}


def capture_state(page):
    return page.evaluate("""() => {
      const root = document.querySelector('[data-wedding-intro]');
      const stage = root?.querySelector('[data-style]');
      const seal = root?.querySelector('[data-seal]');
      const flap = root?.querySelector('[data-flap]');
      const photo = root?.querySelector('[data-photo], [data-letter-photo]');
      const copy = root?.querySelector('[data-copy]');
      const skip = root?.querySelector('[data-skip]');
      const rect = stage?.getBoundingClientRect();
      return {
        introVisible: !!root,
        title: document.title,
        stageRect: rect ? {x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height)} : null,
        flapTransform: flap ? getComputedStyle(flap).transform : null,
        firstCopyOpacity: copy ? getComputedStyle(copy).opacity : null,
        sealDisabled: seal ? seal.disabled : null,
        skipVisible: !!(skip && skip.getBoundingClientRect().width > 0),
        photoLoaded: photo ? photo.complete && photo.naturalWidth > 0 : null,
        pageScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      };
    }""")


def sleep_until(anchor, seconds):
    delay = seconds - (time.monotonic() - anchor)
    if delay > 0:
        time.sleep(delay)


def take_frame(page, case, phase, anchor, goal_time):
    sleep_until(anchor, goal_time)
    filename = f"{case['viewport']}-{case['style']}-{phase}.png"
    target = OUTPUT / filename
    page.screenshot(path=str(target), animations="allow", timeout=30000)
    data = target.read_bytes()
    record = {
        "phase": phase,
        "elapsed_ms": int((time.monotonic()-anchor)*1000),
        "filename": filename,
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "state": capture_state(page),
    }
    case["frames"].append(record)
    print(f"CAPTURE {case['viewport']} {case['style']} {phase}: {record['elapsed_ms']}ms ({len(data)} bytes)")
    return record


def capture_case(browser, label, cfg, style):
    context = browser.new_context(
        viewport={"width": cfg["width"], "height": cfg["height"]},
        device_scale_factor=cfg["scale"], is_mobile=cfg["is_mobile"],
        has_touch=cfg["is_mobile"], locale="ko-KR",
        color_scheme="light", reduced_motion="no-preference",
    )
    page = context.new_page()
    case = {"viewport": label, "style": style, "frames": [], "errors": [], "console_errors": [], "url": f"{BASE_URL}/mobile-intro-preview/?style={style}"}
    page.on("pageerror", lambda e: case["errors"].append(str(e)[:500]))
    page.on("console", lambda msg: case["console_errors"].append(msg.text[:500]) if msg.type == "error" else None)
    try:
        res = page.goto(case["url"], wait_until="domcontentloaded", timeout=60000)
        case["http_status"] = res.status if res else None
        if res is None or not res.ok:
            raise RuntimeError(f"Preview returned {case['http_status']}")
        page.wait_for_selector(f'[data-wedding-intro="{style}"]', state="visible", timeout=30000)
        anchor = time.monotonic()
        if style == "envelope":
            take_frame(page, case, "closed", anchor, .10)
            take_frame(page, case, "before-tap", anchor, .90)
            seal = page.locator("[data-seal]")
            if not seal.is_visible():
                raise RuntimeError("Envelope seal is not visible")
            seal.click(timeout=12000)
            case["tap_at_ms"] = int((time.monotonic()-anchor)*1000)
            click_anchor = time.monotonic()
            for phase, second in PHASES[style][2:]:
                take_frame(page, case, phase, click_anchor, second)
        else:
            for phase, second in PHASES[style]:
                take_frame(page, case, phase, anchor, second)
        case["final_intro_closed"] = page.locator("[data-wedding-intro]").count() == 0
        # Independent refresh validates the skip button, without writing page content.
        page.reload(wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector(f'[data-wedding-intro="{style}"]', state="visible", timeout=30000)
        page.locator("[data-skip]").click(timeout=12000)
        page.wait_for_selector("[data-wedding-intro]", state="detached", timeout=10000)
        case["skip_works"] = True
        # Screen resizing is documented as an immediate-close behavior in the existing component.
        page.reload(wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector(f'[data-wedding-intro="{style}"]', state="visible", timeout=30000)
        page.set_viewport_size({"width": cfg["width"] - 20, "height": cfg["height"]})
        page.wait_for_timeout(120)
        case["intro_closes_on_resize"] = page.locator("[data-wedding-intro]").count() == 0
    except Exception as exc:
        case["failure"] = f"{type(exc).__name__}: {exc}"[:1200]
        print("FAIL", label, style, case["failure"])
    finally:
        page.close()
        context.close()
    return case


def save_sheet(style, cases, device):
    case = next((r for r in cases if r["style"] == style and r["viewport"] == device and r["frames"]), None)
    if not case:
        return
    frames = case["frames"]
    cell_w, cell_h = (280, 620) if device.startswith("mobile") else (400, 300)
    sheet = Image.new("RGB", (cell_w * len(frames), cell_h + 52), "#f8f8f7")
    drawer = ImageDraw.Draw(sheet)
    for i, record in enumerate(frames):
        src = Image.open(OUTPUT/record["filename"]).convert("RGB")
        tile = ImageOps.contain(src, (cell_w - 8, cell_h - 12))
        x = i*cell_w+(cell_w-tile.width)//2
        y = 42
        sheet.paste(tile, (x, y))
        drawer.text((i*cell_w+8, 12), f"{record['phase']} / {record['elapsed_ms']}ms", fill="#202020")
    file = OUTPUT / f"contact-{device}-{style}.jpg"
    sheet.save(file, quality=88, optimize=True)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        for viewport, cfg in VIEWPORTS.items():
            for style in STYLES:
                report["cases"].append(capture_case(browser, viewport, cfg, style))
    finally:
        browser.close()

for viewport in VIEWPORTS:
    for style in STYLES:
        save_sheet(style, report["cases"], viewport)

report["counts"] = {
    "successful_cases": sum(1 for r in report["cases"] if not r.get("failure")),
    "total_cases": len(report["cases"]),
    "frames": sum(len(r["frames"]) for r in report["cases"]),
    "closed_after_animation": sum(1 for r in report["cases"] if r.get("final_intro_closed")),
    "skip_working": sum(1 for r in report["cases"] if r.get("skip_works")),
    "resize_closes_intro": sum(1 for r in report["cases"] if r.get("intro_closes_on_resize")),
}
(OUTPUT/"manifest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n",encoding="utf-8")
lines = [
    "# Invitation 0-A · 기존 인트로 3종 브라우저 캡처",
    "", f"- 소스: {BASE_URL}/mobile-intro-preview/?style=...",
    "- 성격: 배포된 **실제 웹 컴포넌트**를 Chromium에서 실행한 읽기 전용 캡처",
    "- 유의: 실제 고객 페이지가 아닌 **미리보기**로서 대표 사진의 최종 본문 좌표 연결은 포함하지 않음",
    f"- 캡처: {report['counts']['frames']}장 / 성공 {report['counts']['successful_cases']}/{report['counts']['total_cases']}개 환경",
    "", "| 뷰포트 | 스타일 | 프레임 | 자동 종료 | 건너뛰기 | 리사이즈 시 종료 |", "|---|---|---:|---|---|---|",
]
for case in report["cases"]:
    lines.append(f"| {case['viewport']} | {case['style']} | {len(case['frames'])} | {case.get('final_intro_closed', False)} | {case.get('skip_works', False)} | {case.get('intro_closes_on_resize', False)} |")
lines += ["", "## 원본", "모든 이미지 및 각 프레임의 경과 시간/sha256은 manifest.json에 기록.", "미리보기와 운영 고객 데이터는 변경하지 않았습니다.", "", "## 제한", *[f"- {item}" for item in report["limitations"]]]
(OUTPUT/"SUMMARY.md").write_text("\n".join(lines)+"\n",encoding="utf-8")
print("RESULT",json.dumps(report["counts"],ensure_ascii=False))
if report["counts"]["successful_cases"]!=len(report["cases"]):
    raise SystemExit("At least one browser capture case failed; inspect artifacts.")
