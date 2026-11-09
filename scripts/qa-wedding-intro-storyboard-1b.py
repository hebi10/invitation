#!/usr/bin/env python3
"""Invitation 1-B: render static storyboard frames from the offline HTML prototype.

No customer/Firebase writes, no production app changes, no Play/Firebase deploy.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from PIL import Image, ImageDraw, ImageFont, ImageOps
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/design/quiet-invitation/storyboard.html"
OUT = ROOT / "artifacts/quiet-invitation-1b"
OUT.mkdir(parents=True, exist_ok=True)
STYLE_NAMES = {
    "light": "빛에 담긴 초대 · Typography",
    "cinema": "영화처럼 시작 · Editorial Photo",
    "envelope": "당신께 도착한 초대장 · Letter",
}
STYLES = ("light", "cinema", "envelope")
PHASES = ("start", "middle", "end")
SIZES = {
    "mobile390": (390, 844, 2),
    "desktop1440": (1440, 900, 1),
}
STORY_TIME_MS = {
    "light": {"start": 0, "middle": 580, "end": 1400},
    "cinema": {"start": 0, "middle": 650, "end": 1600},
    "envelope": {"start": 0, "middle": 580, "end": 1100},
}
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
]
FONT_PATH = next((x for x in FONT_CANDIDATES if Path(x).exists()), None)
def font(size):
    if FONT_PATH:
        return ImageFont.truetype(FONT_PATH, size)
    return ImageFont.load_default()

def url(style, phase, guide=False):
    query = urlencode({"style": style, "phase": phase, **({"guide": "1"} if guide else {})})
    return SOURCE.resolve().as_uri() + "?" + query

def hashfile(path):
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}

def render_frame(browser, style, phase, view, width, height, scale, manifest):
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=scale,
        is_mobile=(view=="mobile390"),
        has_touch=(view=="mobile390"),
        locale="ko-KR",
        color_scheme="light",
        reduced_motion="no-preference",
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)[:300]))
    try:
        response = page.goto(url(style, phase), wait_until="load", timeout=40000)
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(850)
        stage = page.locator(".stage")
        assert stage.count()==1
        assert page.locator(f".intro-{style}").is_visible() or phase == "end"
        actual_phase=stage.evaluate("(element) => element.closest('[data-phase]').dataset.phase")
        assert actual_phase==phase, (style,phase,actual_phase)
        metrics = page.evaluate("""() => ({
            viewportWidth: window.innerWidth, horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
            stageWidth: Math.round(document.querySelector('.stage').getBoundingClientRect().width),
            imageLoaded: [...document.images].every(img => img.complete && img.naturalWidth > 0),
            style: document.querySelector('main').dataset.introStyle,
            phase: document.querySelector('main').dataset.phase,
            names: document.querySelector('main').innerText.includes('이서준'),
            skipVisible: document.getElementById('skip').getBoundingClientRect().width > 0,
        })""")
        assert not metrics["horizontalOverflow"], metrics
        assert metrics["imageLoaded"], "Local existing wedding photo failed to load"
        assert metrics["names"], "Sample names missing"
        assert not errors, errors
        filename = f"{view}-{style}-{phase}.png"
        output = OUT / filename
        page.screenshot(path=str(output), animations="disabled")
        manifest["frames"].append({
            "filename": filename, "viewport": view, "style": style, "phase": phase,
            "timeline_ms": STORY_TIME_MS[style][phase], "px_size": [width*scale,height*scale],
            "metrics": metrics, **hashfile(output)
        })
        print("CAPTURE", filename, output.stat().st_size)
    finally:
        context.close()

def responsive_qa(browser, manifest):
    for width in (320, 360, 430, 600, 840, 1280):
        for style in STYLES:
            context = browser.new_context(viewport={"width":width,"height":900},device_scale_factor=1)
            page=context.new_page()
            try:
                page.goto(url(style, "middle"),wait_until="load",timeout=40000)
                page.evaluate("document.fonts.ready")
                measurements = page.evaluate("""() => {
                   const stage = document.querySelector('.stage').getBoundingClientRect();
                   const btn = document.getElementById('skip').getBoundingClientRect();
                   return {width:innerWidth, scrollWidth:document.documentElement.scrollWidth,
                     stageWidth:stage.width, skipHit: [btn.width, btn.height],
                     imageLoaded:[...document.images].every(x=>x.complete&&x.naturalWidth>0)};
                }""")
                assert measurements["scrollWidth"] <= measurements["width"], measurements
                assert measurements["stageWidth"] <= min(width,480)+1, measurements
                assert measurements["skipHit"][1] >= 48, measurements
                assert measurements["imageLoaded"], measurements
                manifest["responsive"].append({"style":style,"width":width,**measurements})
            finally:
                context.close()

def interaction_qa(browser, manifest):
    for style in STYLES:
        context=browser.new_context(viewport={"width":390,"height":844},device_scale_factor=1)
        page=context.new_page()
        try:
            page.goto(url(style,"start"),wait_until="load",timeout=30000)
            page.locator("#skip").click(timeout=8000)
            assert page.locator("main").get_attribute("data-phase")=="end"
            manifest["interactions"].append({"style":style,"skip":True})
            if style=="envelope":
                page.goto(url(style,"start"),wait_until="load",timeout=30000)
                page.locator("#open-letter").click(timeout=8000)
                page.wait_for_timeout(1250)
                assert page.locator("main").get_attribute("data-phase")=="end"
                manifest["interactions"].append({"style":style,"open_letter":True})
        finally:
            context.close()
    context=browser.new_context(viewport={"width":390,"height":844},reduced_motion="reduce")
    page=context.new_page()
    try:
        page.goto(url("light","start",guide=True),wait_until="load",timeout=30000)
        page.locator("#play").click(timeout=8000)
        assert page.locator("main").get_attribute("data-phase")=="end"
        manifest["reduced_motion_play_immediate"] = True
    finally:
        context.close()

def contact_sheets(manifest):
    for view, (width,height,scale) in SIZES.items():
        for style in STYLES:
            frame_files = [OUT/f"{view}-{style}-{phase}.png" for phase in PHASES]
            cell_w, cell_h = (310,690) if view=="mobile390" else (520,340)
            canvas = Image.new("RGB", (cell_w*3,cell_h+80), "#f8f8f7")
            draw=ImageDraw.Draw(canvas)
            draw.text((18,12),STYLE_NAMES[style] + " / " + view, fill="#282725", font=font(19))
            for idx,(phase,filename) in enumerate(zip(PHASES,frame_files)):
                im=Image.open(filename).convert("RGB")
                mini=ImageOps.contain(im,(cell_w-16,cell_h-30))
                left=idx*cell_w+(cell_w-mini.width)//2
                top=76+(cell_h-30-mini.height)//2
                canvas.paste(mini,(left,top))
                draw.text((idx*cell_w+15,48),f"{phase.upper()}  {STORY_TIME_MS[style][phase]}ms",
                          fill="#66635e",font=font(14))
            target=OUT/f"{view}-{style}-contact-sheet.jpg"
            canvas.save(target,quality=91,optimize=True)
            manifest["contact_sheets"].append({"filename":target.name,**hashfile(target)})
    master = Image.new("RGB",(3*330,3*730+100),"#f8f8f7")
    draw=ImageDraw.Draw(master)
    draw.text((22,20),"QUIET INVITATION / 1-B",fill="#282725",font=font(27))
    draw.text((22,59),"모바일 390 x 844 · 3개 인트로 x 3단계",fill="#66635e",font=font(16))
    for row,style in enumerate(STYLES):
        for col,phase in enumerate(PHASES):
            src=Image.open(OUT/f"mobile390-{style}-{phase}.png").convert("RGB")
            thumb=ImageOps.contain(src,(320,680))
            x=col*330+(330-thumb.width)//2
            y=100+row*730
            master.paste(thumb,(x,y))
            draw.text((col*330+8,y+692),f"{style.upper()} / {phase}",fill="#282725",font=font(15))
    target=OUT/"01-all-mobile-storyboard.jpg"
    master.save(target,quality=90,optimize=True)
    manifest["master_preview"] = {"filename":target.name,**hashfile(target)}

manifest={
 "title":"Invitation 1-B Quiet Invitation static storyboard",
 "source_git":"docs/design/quiet-invitation/storyboard.html",
 "source_type":"standalone design prototype (not deployed product screen)",
 "production_modified":False, "customer_data_modified":False,
 "sample_persona":{"names":"이서준 · 김하은","date":"2027-04-17","venue":"메종 가든 · 샘플 예식장"},
 "created_utc":datetime.now(timezone.utc).isoformat(),
 "frames":[], "responsive":[], "interactions":[], "contact_sheets":[],
 "timing_ms":STORY_TIME_MS,
 "limitations":[
  "The final-phase cover is a design placeholder; it is not verified against live per-theme customers.",
  "The HTML storyboard uses the repository's existing local sample portrait; image source and names are sample-only.",
  "Chrome screenshots and simulated widths do not replace physical Android/iOS/foldable QA.",
  "Motion handoff to the real public WeddingIntro renderer is a later 2-A/3-A task."],
}

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"])
    try:
        for view,(width,height,scale) in SIZES.items():
            for style in STYLES:
                for phase in PHASES:
                    render_frame(browser,style,phase,view,width,height,scale,manifest)
        responsive_qa(browser,manifest)
        interaction_qa(browser,manifest)
    finally:
        browser.close()
contact_sheets(manifest)
summary={
 "frames":len(manifest["frames"]),"contact_sheets":len(manifest["contact_sheets"]),
 "responsive_checks":len(manifest["responsive"]),
 "interactions":len(manifest["interactions"]),
 "reduced_motion_play_immediate":manifest["reduced_motion_play_immediate"]
}
(OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
(OUT/"SUMMARY.md").write_text(
 "# Invitation 1-B — Quiet Invitation 시안 캡처 검증\n\n"
 "실제 React 공개 페이지가 아닌 **HTML/CSS 디자인 프로토타입**에서 브라우저 캡처.\n\n"
 f"- 정적 프레임: {summary['frames']}장 (3 styles × 3 phases × mobile+desktop)\n"
 f"- 스타일별 비교 시트: {summary['contact_sheets']}장\n"
 f"- 반응형 간단 점검: {summary['responsive_checks']}건\n"
 f"- 기본 건너뛰기/편지 열기: {summary['interactions']}건\n"
 f"- 동작 줄이기: {summary['reduced_motion_play_immediate']}\n"
 "- 모든 원본의 SHA-256 및 프레임 타임스탬프: manifest.json\n"
 "- 운영 고객 데이터와 UI, Firebase 배포는 변경하지 않았음\n"
 "- 0-A 기존 인트로의 이미지는 본 ZIP에 포함하지 않으며 이전 0-A 자료와 대조해야 함\n"
 ,encoding="utf-8")
print("1-B SUCCESS",json.dumps(summary,ensure_ascii=False))
assert summary["frames"]==18 and summary["contact_sheets"]==6 and summary["responsive_checks"]==18
