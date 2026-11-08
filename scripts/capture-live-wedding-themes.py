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
        preflight = context.new_page()
        for attempt in range(60):
            preflight.goto(f"{BASE}/{SLUG}/simple/", wait_until="domcontentloaded", timeout=60000)
            preflight.get_by_text("김현지", exact=False).first.wait_for(timeout=25000)
            quick = preflight.locator('nav[aria-label="청첩장 바로가기"] a')
            quick.first.wait_for(timeout=20000)
            order = quick.evaluate_all("(anchors) => anchors.map(a => a.getAttribute('href'))")
            cover_ratio = preflight.locator('[data-wedding-cover-frame]').first.evaluate(
                "(el) => el.getBoundingClientRect().width / el.getBoundingClientRect().height"
            )
            if order[:2] == ["#wedding-info", "#wedding-location"] and abs(cover_ratio - 0.8) < 0.02:
                print("STAGE3_DEPLOYMENT_CONFIRMED", order, cover_ratio, flush=True)
                break
            print("STAGE3_DEPLOYMENT_PENDING", attempt + 1, order, cover_ratio, flush=True)
            preflight.wait_for_timeout(5000)
        else:
            raise RuntimeError("Stage3 public build not yet active after preflight retries")
        preflight.close()

        for theme, short in THEMES:
            page = context.new_page()
            music_responses = []
            page.on("response", lambda response: music_responses.append({
                "status": response.status,
                "path": response.url.split("?")[0].split("/o/")[-1][:180],
            }) if "music%2F" in response.url else None)
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
            # A cold Firebase hydration can delay music setup, especially on the first route.
            # Wait for the real music control (or a diagnosable error), not an arbitrary fixed timer.
            try:
                page.wait_for_function(
                    """() => Boolean(document.querySelector(
                        'button[aria-label="음악 켜기"],button[aria-label="음악 끄기"],button[aria-label="음악 다시 시도"]'
                    ))""",
                    timeout=20000,
                    polling=250,
                )
            except Exception:
                print("STAGE1_MUSIC_WAIT_TIMEOUT", theme, flush=True)
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
                  audio: [...document.querySelectorAll('audio')].map(a => ({
                    readyState: a.readyState, error: a.error?.code ?? null,
                    paused: a.paused
                  })),
                  visibleLabels: [...document.querySelectorAll('button[aria-label]')]
                    .map(node => node.getAttribute('aria-label')).filter(label =>
                      label?.includes('음악') || label?.includes('닫기')).slice(0, 20),
                  componentNodes: [...document.querySelectorAll('[class*="BackgroundMusic_"]')]
                    .map(node => ({name: node.className,
                      display: getComputedStyle(node).display})).slice(0, 12),
                  bodyTail: document.body.innerText.slice(-280)
                };
            }""")
            audit["issues"] = []
            if not audit["music"]:
                audit["issues"].append("stage1 music control missing")
            else:
                control = audit["music"]
                if control["width"] != 44 or control["height"] != 44 or control["y"] > 80:
                    audit["issues"].append(f"music control not in top 44px dock: {control}")
            if audit["scrollWidth"] > audit["viewportWidth"] + 1:
                audit["issues"].append("unexpected horizontal overflow at 390px")
            audit["musicResponses"] = music_responses[:8]
            print("STAGE1_AUDIT", theme, json.dumps(audit, ensure_ascii=False), flush=True)

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
            for landing in anchor_results:
                if landing["status"] != "checked" or not 55 <= landing.get("landingTop", -1) <= 180:
                    audit["issues"].append(f"quick link landing outside accessible area: {landing}")
            if theme in ("simple", "gyeol") and audit["activeGalleryPhotoState"] not in ("ready", "loading"):
                audit["issues"].append(f"gallery photo has no valid active loading state: {audit['activeGalleryPhotoState']}")

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
                if dimensions["documentWidth"] > dimensions["viewportWidth"] + 1:
                    audit["issues"].append(f"horizontal overflow at {width}px: {dimensions}")
                small_viewports.append({"file": viewport_file, **dimensions})
            page.set_viewport_size({"width": 390, "height": 844})
            stage2_audit = page.evaluate("""() => {
                const linkHrefs = (selector) => [...document.querySelectorAll(selector)]
                    .map(element => element.getAttribute('href'));
                const page = document.querySelector('main[data-design]');
                const gallery = page?.querySelector('[data-wedding-section="gallery"] > section');
                const guestbook = page?.querySelector('[data-wedding-section="guestbook"] [class*="commentsGrid"]');
                const footerLinks = [...document.querySelectorAll('nav[aria-label="예식 정보 다시 보기"] a')];
                const getTop = (id) => document.getElementById(id)?.getBoundingClientRect().top ?? null;
                return {
                    quickHrefs: linkHrefs('nav[aria-label="청첩장 바로가기"] a'),
                    returnHrefs: linkHrefs('nav[aria-label="예식 정보 다시 보기"] a'),
                    galleryMarginTop: gallery ? parseFloat(getComputedStyle(gallery).marginTop) : null,
                    guestbookRowGap: guestbook ? parseFloat(getComputedStyle(guestbook).rowGap) : null,
                    footerLinkHeights: footerLinks.map(link => Math.round(link.getBoundingClientRect().height)),
                    hasCeremony: Boolean(document.getElementById('wedding-info')),
                    hasLocation: Boolean(document.getElementById('wedding-location')),
                    hasClosing: Boolean(document.querySelector('[data-wedding-closing]')),
                    hasGallery: Boolean(gallery),
                    viewport: window.innerWidth,
                    scrollWidth: document.documentElement.scrollWidth
                };
            }""")
            if stage2_audit["quickHrefs"] != ["#wedding-info", "#wedding-location", "#wedding-gallery"]:
                audit["issues"].append(f"stage2 quick links order mismatch: {stage2_audit['quickHrefs']}")
            if stage2_audit["returnHrefs"][:2] != ["#wedding-info", "#wedding-location"]:
                audit["issues"].append(f"stage2 return link order mismatch: {stage2_audit['returnHrefs']}")
            margin = stage2_audit["galleryMarginTop"]
            if margin is None or not 43 <= margin <= 65:
                audit["issues"].append(f"stage2 gallery spacing out of range: {margin}")
            gap = stage2_audit["guestbookRowGap"]
            if theme != "simple" and gap is not None and not 13 <= gap <= 23:
                audit["issues"].append(f"stage2 guestbook spacing out of range: {gap}")
            if not all(height >= 44 for height in stage2_audit["footerLinkHeights"]):
                audit["issues"].append(f"stage2 return touch target below 44px: {stage2_audit['footerLinkHeights']}")
            if not all(stage2_audit[key] for key in ("hasCeremony", "hasLocation", "hasClosing", "hasGallery")):
                audit["issues"].append(f"stage2 required wedding section missing: {stage2_audit}")
            print("STAGE2_AUDIT", theme, json.dumps(stage2_audit, ensure_ascii=False), flush=True)

            stage3_audit = page.evaluate("""() => {
                const root = document.querySelector('main[data-design]');
                const design = root?.getAttribute('data-design') ?? '';
                const cover = document.querySelector('[data-wedding-cover-frame]');
                const coverBox = cover?.getBoundingClientRect();
                const gallery = root?.querySelector('[data-wedding-section="gallery"] > section');
                const frame = root?.querySelector('[data-gallery-variant="simple"] .swiper-slide-active button');
                const frameBox = frame?.getBoundingClientRect();
                const photo = frame?.querySelector('img');
                const grid = root?.querySelector('[data-wedding-section="gallery"] [class*="WeddingGallery_imageGrid"]');
                const title = root?.querySelector('[data-wedding-section="gallery"] h2');
                return {
                    design,
                    coverRatio: coverBox && coverBox.height ? +(coverBox.width / coverBox.height).toFixed(3) : null,
                    coverHeight: coverBox ? Math.round(coverBox.height) : null,
                    galleryWidth: gallery ? Math.round(gallery.getBoundingClientRect().width) : null,
                    simpleCarouselRatio: frameBox && frameBox.height ? +(frameBox.width / frameBox.height).toFixed(3) : null,
                    simpleObjectFit: photo ? getComputedStyle(photo).objectFit : null,
                    modernGridRowGap: grid ? parseFloat(getComputedStyle(grid).rowGap) : null,
                    modernGridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
                    modernNumberSize: title ? parseFloat(getComputedStyle(title, '::before').fontSize) : null,
                    modernEnglishSize: title ? parseFloat(getComputedStyle(title, '::after').fontSize) : null,
                    hasCeremony: Boolean(document.getElementById('wedding-info')),
                    hasLocation: Boolean(document.getElementById('wedding-location')),
                    hasClosing: Boolean(document.querySelector('[data-wedding-closing]')),
                    hasGuestbook: Boolean(root?.querySelector('[data-wedding-section="guestbook"]')),
                };
            }""")
            print("STAGE3_AUDIT", theme, json.dumps(stage3_audit, ensure_ascii=False), flush=True)
            if theme in ("simple", "classic-r"):
                if stage3_audit["coverRatio"] is None or abs(stage3_audit["coverRatio"] - 0.8) > 0.02:
                    audit["issues"].append(f"stage3 {theme}: cover aspect ratio is not 4:5")
                expected_width = 358 if theme == "simple" else 350
                if abs((stage3_audit["galleryWidth"] or 0) - expected_width) > 3:
                    audit["issues"].append(f"stage3 {theme}: gallery width mismatch: {stage3_audit['galleryWidth']}")
            if theme == "simple":
                if stage3_audit["simpleCarouselRatio"] is None or abs(stage3_audit["simpleCarouselRatio"] - 0.75) > 0.03:
                    audit["issues"].append(f"stage3 simple: portrait carousel ratio mismatch: {stage3_audit['simpleCarouselRatio']}")
                if stage3_audit["simpleObjectFit"] != "contain":
                    audit["issues"].append("stage3 simple: original photo must not be cropped")
            if theme == "classic-r":
                if stage3_audit["modernGridRowGap"] is None or abs(stage3_audit["modernGridRowGap"] - 18) > 1:
                    audit["issues"].append(f"stage3 modern: two-column grid row gap mismatch: {stage3_audit['modernGridRowGap']}")
                if stage3_audit["modernNumberSize"] is None or abs(stage3_audit["modernNumberSize"] - 30) > 1:
                    audit["issues"].append(f"stage3 modern: section numbering font mismatch: {stage3_audit['modernNumberSize']}")
                if stage3_audit["modernEnglishSize"] is None or abs(stage3_audit["modernEnglishSize"] - 10) > 1:
                    audit["issues"].append(f"stage3 modern: English eyebrow font mismatch: {stage3_audit['modernEnglishSize']}")
            if not all(stage3_audit[k] for k in ("hasCeremony", "hasLocation", "hasClosing", "hasGuestbook")):
                audit["issues"].append(f"stage3 {theme}: required wedding content missing")

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
                }, stage2Audit=stage2_audit, stage3Audit=stage3_audit))
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
    notes="After Stage3 eeccc54 Firebase App Hosting rollout; simple and classic-r targeted design audit, other three regression screenshots. Actual groom label 신민제.",
    viewport=dict(width=390, height=844, deviceScaleFactor=2),
    captures=captures)
(OUT / "capture-manifest.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("ALL_FIVE_COMPLETE", flush=True)
for candidate in captures:
    warnings = candidate["stage1Audit"].get("issues", [])
    if warnings:
        print("STAGE1_ISSUES", candidate["theme"], json.dumps(warnings, ensure_ascii=False), flush=True)
if any(candidate["stage1Audit"].get("issues") for candidate in captures):
    raise RuntimeError("Stage1 live browser QA detected a regression; see capture-manifest.json")
