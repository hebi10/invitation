#!/usr/bin/env python3
"""P1 photo/classic desktop music visual QA on the fictional 2027 sample only."""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_LOCAL_BASE", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/invitation-p1-photo-classic-music")
OUT.mkdir(parents=True, exist_ok=True)
SIZES = {
    "mobile320": (320, 740, 2),
    "mobile390": (390, 844, 2),
    "mobile430": (430, 932, 2),
    "desktop1440": (1440, 900, 1),
}
THEMES = ("romantic", "gyeol")
data = {
    "source": "Isolated local Next.js fictional /sample-invitation?qaTheme=romantic|gyeol",
    "production_firebase_writes": 0,
    "rendered_at_utc": datetime.now(timezone.utc).isoformat(),
    "cases": [],
}


def capture(page, filename, full=False, selector=None):
    output = OUT / filename
    if selector:
        page.locator(selector).first.screenshot(path=str(output), animations="disabled", timeout=60000)
    else:
        page.screenshot(path=str(output), full_page=full, animations="disabled", timeout=60000)
    payload = output.read_bytes()
    return {"name": filename, "bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest()}


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        for theme in THEMES:
            for name, (width, height, scale) in SIZES.items():
                context = browser.new_context(
                    viewport={"width": width, "height": height},
                    device_scale_factor=scale, locale="ko-KR",
                    reduced_motion="reduce", color_scheme="light",
                )
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)[:400]))
                row = {"theme": theme, "viewport": name, "size_css": [width, height], "passed": False}
                try:
                    response = page.goto(
                        f"{BASE}/sample-invitation/?qaTheme={theme}&qaMusic=1&embed=1",
                        wait_until="domcontentloaded", timeout=90000,
                    )
                    assert response and response.status == 200
                    page.locator(f'main[data-design="{theme}"]').wait_for(state="visible", timeout=40000)
                    page.locator('[data-wedding-cover-photo]').wait_for(state="visible", timeout=20000)
                    page.wait_for_function("""() => {
                        const photo = document.querySelector('[data-wedding-cover-photo]');
                        return photo && photo.complete && photo.naturalWidth > 0;
                    }""", timeout=30000)
                    page.evaluate("document.fonts.ready")
                    page.locator('[data-wedding-section="gallery"]').scroll_into_view_if_needed()
                    page.locator('[data-wedding-section="gallery"] [data-photo-position="1"]').wait_for(
                        state="visible", timeout=20000
                    )
                    page.get_by_role("button", name="음악 켜기").wait_for(state="visible", timeout=12000)
                    row["metrics"] = page.evaluate("""(theme) => {
                      const main = document.querySelector(`main[data-design="${theme}"]`);
                      const frame = main?.querySelector('[data-wedding-cover-frame]');
                      const details = main?.querySelector('[data-wedding-cover-details]');
                      const gallery = main?.querySelector('[data-wedding-section="gallery"]');
                      const primary = gallery?.querySelector('[data-photo-position="1"]');
                      const music = document.querySelector('button[aria-label="음악 켜기"]');
                      const mr = main?.getBoundingClientRect();
                      const fr = frame?.getBoundingClientRect();
                      const gr = gallery?.getBoundingClientRect();
                      const pr = primary?.getBoundingClientRect();
                      const br = music?.getBoundingClientRect();
                      const dr = details?.getBoundingClientRect();
                      return {
                        theme: main?.dataset.design,
                        mainLeft: mr?.left, mainRight: mr?.right,
                        coverRatio: fr ? fr.width / fr.height : null,
                        coverHeight: fr?.height,
                        galleryHeight: gr?.height,
                        firstGalleryRatio: pr ? pr.width / pr.height : null,
                        galleryPhotoCount: gallery?.querySelectorAll('[data-photo-position]').length ?? 0,
                        musicLeft: br?.left, musicRight: br?.right,
                        musicControlHeight: br?.height,
                        musicPosition: music ? getComputedStyle(music.parentElement).position : null,
                        detailsVisible: !!dr && dr.height > 0,
                        doubleFrame: theme !== 'gyeol' || (!!details?.querySelector('div') && getComputedStyle(details.querySelector('div')).outlineStyle === 'solid'),
                        datesIntact: !!main?.innerText?.includes('2027'),
                        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
                      };
                    }""", theme)
                    m = row["metrics"]
                    assert m["theme"] == theme, m
                    assert m["datesIntact"] and m["detailsVisible"], m
                    assert not m["horizontalOverflow"], m
                    assert m["galleryPhotoCount"] > 0, m
                    assert m["musicPosition"] == "fixed", m
                    assert m["musicControlHeight"] >= 44, m
                    if theme == "romantic":
                        assert abs(m["firstGalleryRatio"] - 1.2) < 0.03, m
                    else:
                        assert abs(m["coverRatio"] - .75) < .02, m
                        assert m["doubleFrame"], m
                    if width >= 769:
                        assert m["musicLeft"] >= m["mainLeft"] - 1, m
                        assert m["musicRight"] <= m["mainRight"] + 1, m
                    else:
                        assert width - m["musicRight"] <= 20, m
                    if errors:
                        raise AssertionError("JavaScript errors: " + str(errors))
                    row["cover"] = capture(page, f"{theme}-{name}-cover.png", selector='[data-wedding-cover-frame]')
                    row["gallery"] = capture(page, f"{theme}-{name}-gallery.png", selector='[data-wedding-section="gallery"]')
                    if width in (390, 1440):
                        row["full_page"] = capture(page, f"{theme}-{name}-full.png", full=True)
                    row["passed"] = True
                    print("P1_VISUAL_OK", theme, name, json.dumps(m, ensure_ascii=False), flush=True)
                except Exception as exc:
                    row["failure"] = type(exc).__name__ + ": " + str(exc)[:2000]
                    print("P1_VISUAL_FAIL", theme, name, row["failure"], flush=True)
                finally:
                    data["cases"].append(row)
                    context.close()
    finally:
        browser.close()

data["summary"] = {"passed": sum(case["passed"] for case in data["cases"]), "total": len(data["cases"])}
(OUT / "manifest.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("P1_VISUAL_SUMMARY", json.dumps(data["summary"], ensure_ascii=False))
if data["summary"]["passed"] != data["summary"]["total"]:
    raise SystemExit("P1 visual verification failed")
