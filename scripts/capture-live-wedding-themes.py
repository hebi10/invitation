#!/usr/bin/env python3
"""Capture the live public, test-only invitation in five wedding themes."""
from __future__ import annotations
import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
from playwright.sync_api import sync_playwright

OUT = Path("artifacts/live-wedding-theme-captures")
OUT.mkdir(parents=True, exist_ok=True)
SLUG = "shin-minje-kim-hyunji"
BASE = "https://invite.msgnote.kr"
THEMES = [
    ("simple", "01-basic"),
    ("classic-r", "02-modern"),
    ("romantic", "03-photo"),
    ("gyeol", "04-classic"),
    ("emotional", "05-natural"),
]
captures = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
        locale="ko-KR",
        color_scheme="light",
        reduced_motion="reduce",
    )
    try:
        for theme, short in THEMES:
            page = context.new_page()
            url = f"{BASE}/{SLUG}/{theme}/"
            response = page.goto(url, wait_until="domcontentloaded", timeout=60000)
            if response is None or response.status != 200:
                raise RuntimeError(f"{theme}: page response was {response.status if response else 'none'}")
            page.get_by_text("김현지", exact=False).first.wait_for(timeout=25000)
            intro = page.get_by_role("dialog", name="결혼식 초대장 인트로")
            if intro.count() > 0 and intro.first.is_visible():
                page.get_by_role("button", name="건너뛰기").first.click(timeout=7000)
                page.wait_for_timeout(400)
            page.add_style_tag(content="""
                *, *::before, *::after {animation-duration:0s!important;
                  transition-duration:0s!important;scroll-behavior:auto!important}
                html, body {scrollbar-width:none!important}
                ::-webkit-scrollbar {display:none!important}
            """)
            # Scroll all the way through so lazy-loaded media and below-fold content are rendered.
            height = page.evaluate("document.documentElement.scrollHeight")
            for y in range(0, height, 570):
                page.evaluate("(y)=>window.scrollTo(0,y)", y)
                page.wait_for_timeout(120)
            page.wait_for_timeout(900)
            page.evaluate("window.scrollTo(0,0)")
            page.evaluate("document.fonts.ready")
            page.wait_for_timeout(500)
            # An audio warning may appear when the public music service is unavailable.
            # Dismiss it for the visual reference; capture the warning in QA metadata.
            music_warning = page.get_by_text("음악을 불러오지 못했어요", exact=False).count() > 0
            if music_warning:
                dismiss = page.get_by_role("button", name="음악 안내 닫기")
                if dismiss.count() > 0:
                    dismiss.first.evaluate("(button) => button.click()")
                    page.wait_for_timeout(300)
            filename = f"{short}-full.jpg"
            target = OUT / filename
            page.screenshot(path=str(target), type="jpeg", quality=84,
                            full_page=True, animations="disabled", timeout=60000)
            audit = page.evaluate("""() => {
                const button = document.querySelector(
                  'button[aria-label="음악 켜기"], button[aria-label="음악 끄기"], button[aria-label="음악 다시 시도"]'
                );
                const rect = button?.getBoundingClientRect();
                const dock = button?.parentElement;
                const music = button && rect ? {
                  label: button.getAttribute('aria-label'),
                  x: Math.round(rect.left), y: Math.round(rect.top),
                  width: Math.round(rect.width), height: Math.round(rect.height),
                  dockPosition: dock ? getComputedStyle(dock).position : null,
                } : null;
                const images = [...document.images].filter(img => Boolean(img.src));
                const activePhoto = document.querySelector('.swiper-slide-active [data-gallery-photo-state]');
                return {
                  music,
                  activeGalleryPhotoState: activePhoto?.getAttribute('data-gallery-photo-state') ?? null,
                  imageStates: {
                    ready: images.filter(img => img.complete && img.naturalWidth > 0).length,
                    failed: images.filter(img => img.complete && img.naturalWidth === 0).length,
                    pending: images.filter(img => !img.complete).length
                  },
                  viewportWidth: window.innerWidth,
                  scrollWidth: document.documentElement.scrollWidth,
                };
            }""")
            anchor_results = []
            for target_id in ("wedding-gallery", "wedding-info", "wedding-location"):
                anchor = page.locator(
                    f'nav[aria-label="청첩장 바로가기"] a[href="#{target_id}"]'
                )
                if anchor.count() == 0:
                    anchor_results.append({"id": target_id, "status": "missing"})
                    continue
                try:
                    anchor.first.click(timeout=8000)
                    page.wait_for_timeout(220)
                    landing_top = page.locator(f"#{target_id}").first.evaluate(
                        "(element) => Math.round(element.getBoundingClientRect().top)"
                    )
                    anchor_results.append({"id": target_id, "status": "checked", "landingTop": landing_top})
                except Exception as exc:
                    anchor_results.append({"id": target_id, "status": "error", "reason": str(exc)[:150]})
            small_viewports = []
            for width in (320, 430):
                page.set_viewport_size({"width": width, "height": 844})
                page.evaluate("window.scrollTo(0, 0)")
                page.wait_for_timeout(280)
                viewport_file = f"{short}-viewport-{width}.jpg"
                page.screenshot(path=str(OUT / viewport_file), type="jpeg",
                                quality=83, full_page=False, animations="disabled", timeout=30000)
                dimensions = page.evaluate("""() => ({
                    viewportWidth: window.innerWidth,
                    documentWidth: document.documentElement.scrollWidth
                })""")
                small_viewports.append({"file": viewport_file, **dimensions})
            page.set_viewport_size({"width": 390, "height": 844})
            info = page.evaluate("""() => ({
                title: document.title, pageHeight: document.documentElement.scrollHeight,
                bodyText: document.body.innerText.slice(0,350),
                imageCount: document.images.length,
                brokenImages: [...document.images].filter(img =>
                   img.src && (!img.complete || img.naturalWidth === 0)).length
            })""")
            if target.stat().st_size < 12000 or info["pageHeight"] < 1500:
                raise RuntimeError(f"{theme}: suspicious screenshot dimensions/size")
            digest = hashlib.sha256(target.read_bytes()).hexdigest()
            captures.append(dict(theme=theme, filename=filename, sourceUrl=url,
                audioWarningDismissed=music_warning,
                httpStatus=response.status, bytes=target.stat().st_size,
                sha256=digest, **info, stage1Audit={
                    **audit, "anchors": anchor_results, "responsive": small_viewports
                }))
            print(f"CAPTURE_OK {theme}: {info['pageHeight']}px, {target.stat().st_size} bytes, broken={info['brokenImages']}", flush=True)
            page.close()
    finally:
        browser.close()

if len(captures) != 5:
    raise RuntimeError("All five themes are required.")
label_width, label_height = 260, 680
overview = Image.new("RGB", (5 * label_width + 12, label_height + 36), "#f5f5f5")
draw = ImageDraw.Draw(overview)
for idx, item in enumerate(captures):
    img = Image.open(OUT / item["filename"]).convert("RGB")
    excerpt = img.crop((0, 0, img.width, min(img.height, 2000)))
    thumb = ImageOps.fit(excerpt, (248, 640), method=Image.Resampling.LANCZOS,
                         centering=(0.5, 0.0))
    x = 8 + idx * label_width
    overview.paste(thumb, (x, 40))
    draw.text((x, 15), item["theme"], fill="#111111")
overview.save(OUT / "00-five-themes-overview.jpg", quality=85)
report = dict(capturedAt=datetime.now(timezone.utc).isoformat(),
    source="Public Firebase-hosted test invitation", slug=SLUG,
    notes="Live production-domain public page capture; not a design mockup. Actual page labels groom as 신민제.",
    viewport=dict(width=390, height=844, deviceScaleFactor=2),
    captures=captures)
(OUT / "capture-manifest.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("ALL_FIVE_COMPLETE", flush=True)
