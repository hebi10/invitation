#!/usr/bin/env python3
"""Read-only five-theme P2 React/CSS, keyboard, and responsive QA using fictional sample data."""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_LOCAL_BASE", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/invitation-p2-editorial-natural")
OUT.mkdir(parents=True, exist_ok=True)
THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")
VIEWPORTS = {
    "mobile320": (320, 740, 2),
    "mobile390": (390, 844, 2),
    "mobile430": (430, 932, 2),
    "desktop1440": (1440, 900, 1),
}
manifest = {
    "source": "isolated fictional 2027 sample; no Firebase credentials; actual Next.js + Chromium",
    "production_writes": 0,
    "physical_device_tested": False,
    "created_utc": datetime.now(timezone.utc).isoformat(),
    "cases": [],
}


def capture(page, filename, full=False, selector=None):
    target = OUT / filename
    if selector:
        page.locator(selector).first.screenshot(path=str(target), animations="disabled", timeout=60000)
    else:
        page.screenshot(path=str(target), full_page=full, animations="disabled", timeout=60000)
    data = target.read_bytes()
    return {"file": filename, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        for theme in THEMES:
            for label, (width, height, scale) in VIEWPORTS.items():
                context = browser.new_context(
                    viewport={"width": width, "height": height},
                    device_scale_factor=scale,
                    locale="ko-KR",
                    reduced_motion="reduce",
                    color_scheme="light",
                )
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)[:400]))
                case = {"theme": theme, "viewport": label, "width": width, "passed": False}
                try:
                    response = page.goto(
                        f"{BASE}/sample-invitation/?qaTheme={theme}&embed=1",
                        wait_until="domcontentloaded",
                        timeout=90000,
                    )
                    assert response is not None and response.status == 200, "HTTP status"
                    main = page.locator(f'main[data-design="{theme}"]')
                    main.wait_for(state="visible", timeout=40000)
                    cover = page.locator('[data-wedding-cover-photo]')
                    cover.wait_for(state="visible", timeout=20000)
                    page.wait_for_function("""() => {
                      const image = document.querySelector('[data-wedding-cover-photo]');
                      return image && image.complete && image.naturalWidth > 0;
                    }""", timeout=30000)
                    page.evaluate("document.fonts.ready")
                    page.add_style_tag(content="nextjs-portal { display: none !important; }")
                    gallery = page.locator('[data-wedding-section="gallery"]')
                    gallery.scroll_into_view_if_needed()
                    first_photo = gallery.locator('button[aria-label*="크게 보기"]').first
                    first_photo.wait_for(state="visible", timeout=25000)
                    page.wait_for_function("""() => {
                      const slider = document.querySelector('[data-wedding-section="gallery"] [data-gallery-variant]');
                      const active = slider?.querySelector('.swiper-slide-active button[aria-label*="크게 보기"]');
                      return Boolean(active && active.getBoundingClientRect().width > 0 &&
                        active.getBoundingClientRect().height > 0);
                    }""", timeout=20000)
                    metrics = page.evaluate("""(theme) => {
                      const main = document.querySelector('main[data-design="' + theme + '"]');
                      const gallery = main?.querySelector('[data-wedding-section="gallery"]');
                      const slider = gallery?.querySelector('[data-gallery-variant]');
                      const activePhoto = slider?.querySelector('.swiper-slide-active button[aria-label*="크게 보기"]');
                      const heading = gallery?.querySelector('h2');
                      const coverMeta = main?.querySelector('[data-wedding-cover-details] p');
                      const mr = main?.getBoundingClientRect();
                      const sliderRect = slider?.getBoundingClientRect();
                      const activeRect = activePhoto?.getBoundingClientRect();
                      const font = el => el ? parseFloat(getComputedStyle(el).fontSize) : null;
                      return {
                        design: main?.dataset.design,
                        mainLeft: mr?.left, mainRight: mr?.right,
                        viewport: window.innerWidth,
                        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
                        hasH1: main?.querySelectorAll('h1').length === 1,
                        coverAlt: main?.querySelector('[data-wedding-cover-photo]')?.getAttribute('alt') || '',
                        anchors: main?.querySelectorAll('nav[aria-label="청첩장 바로가기"] a[href^="#"]').length || 0,
                        galleryButtonsNamed: [...gallery?.querySelectorAll('button[aria-label*="크게 보기"]') || []].some(b => b.getAttribute('aria-label').includes('사진')),
                        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
                        editorialSubtitleFont: theme === 'classic-r' ? parseFloat(getComputedStyle(heading,'::after').fontSize) : null,
                        editorialCoverLabelFont: font(coverMeta),
                        galleryVariant: slider?.dataset.galleryVariant,
                        gallerySlideCount: slider?.querySelectorAll('.swiper-slide button[aria-label*="크게 보기"]').length ?? 0,
                        galleryControls: slider?.querySelector('[role="status"][aria-live="polite"]') !== null,
                        galleryViewportWidth: sliderRect?.width,
                        activePhotoWidth: activeRect?.width,
                        activePhotoHeight: activeRect?.height
                      };
                    }""", theme)
                    case["metrics"] = metrics
                    assert metrics["design"] == theme, metrics
                    assert not metrics["horizontalOverflow"], metrics
                    assert metrics["hasH1"] and metrics["coverAlt"] and metrics["anchors"] >= 2, metrics
                    assert metrics["galleryButtonsNamed"] and metrics["reducedMotion"], metrics
                    if width >= 769:
                        assert abs(metrics["mainLeft"] - (width - 480) / 2) <= 2, metrics
                        assert abs(metrics["mainRight"] - (width + 480) / 2) <= 2, metrics
                    assert metrics["galleryVariant"] == theme, metrics
                    assert metrics["gallerySlideCount"] >= 1 and metrics["galleryControls"], metrics
                    assert metrics["activePhotoWidth"] > 0 and metrics["activePhotoHeight"] > 0, metrics
                    assert metrics["activePhotoWidth"] <= metrics["galleryViewportWidth"] + 2, metrics
                    if theme == "classic-r":
                        assert metrics["editorialSubtitleFont"] >= 13, metrics
                        assert metrics["editorialCoverLabelFont"] >= 13, metrics
                    case["gallery"] = capture(page, f"{theme}-{label}-gallery.png", selector='[data-wedding-section="gallery"]')
                    if label in ("mobile390", "desktop1440"):
                        page.evaluate("scrollTo(0,0)")
                        case["viewport_image"] = capture(page, f"{theme}-{label}-cover.png")
                    if label == "mobile390":
                        case["full_page"] = capture(page, f"{theme}-{label}-full.png", full=True)
                        first_photo.focus()
                        assert first_photo.evaluate("(el) => document.activeElement === el")
                        page.keyboard.press("Enter")
                        dialog = page.locator('[role="dialog"][aria-modal="true"]').first
                        dialog.wait_for(state="visible", timeout=12000)
                        page.keyboard.press("Escape")
                        dialog.wait_for(state="hidden", timeout=12000)
                        case["keyboard_gallery_dialog"] = True
                    assert not errors, errors
                    case["passed"] = True
                    print("P2_BROWSER_OK", theme, label, json.dumps(metrics, ensure_ascii=False), flush=True)
                except Exception as error:
                    case["error"] = type(error).__name__ + ": " + str(error)[:2000]
                    print("P2_BROWSER_FAIL", theme, label, case["error"], flush=True)
                finally:
                    manifest["cases"].append(case)
                    context.close()
    finally:
        browser.close()

manifest["summary"] = {
    "passed": sum(case["passed"] for case in manifest["cases"]),
    "total": len(manifest["cases"]),
}
(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("P2_BROWSER_SUMMARY", json.dumps(manifest["summary"]), flush=True)
if manifest["summary"]["passed"] != manifest["summary"]["total"]:
    raise SystemExit("P2 five-theme browser QA failed; inspect artifact")
