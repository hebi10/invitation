#!/usr/bin/env python3
"""UI-07-A-08: same-data visual review against the pre-A-06 baseline.

The workflow injects ONLY the current dev-only fictional sample route into
an isolated historical worktree; production pages and customer data are not used.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat
from playwright.sync_api import sync_playwright

OUT = Path("artifacts/ui-07-a08")
OUT.mkdir(parents=True, exist_ok=True)
BEFORE = os.environ.get("INVITATION_A08_BEFORE", "http://127.0.0.1:3001").rstrip("/")
AFTER = os.environ.get("INVITATION_A08_AFTER", "http://127.0.0.1:3000").rstrip("/")
THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")
SIZES = ((390, 844, 2), (1440, 900, 1))
ALL_SECTIONS = ("contact", "gallery", "transport", "gift", "guestbook")
BEFORE_SHA = os.environ.get("INVITATION_A08_BASE_SHA", "ae8e1ed3f6ff0df36a0f65dbb82f32845053fdea")
AFTER_SHA = os.environ.get("GITHUB_SHA", "unknown")
TRANSPARENT = ("transparent", "rgba(0, 0, 0, 0)")

manifest = {
    "task": "UI-07-A-08",
    "created_utc": datetime.now(timezone.utc).isoformat(),
    "before_code_sha": BEFORE_SHA,
    "after_code_sha": AFTER_SHA,
    "fixture": "identical development-only synthetic qaUI07 full fixture copied to historical worktree",
    "baseline_not_production": True,
    "production_reads_writes": 0,
    "payment_phone_sms_map_clipboard_guestbook_submission_actions": 0,
    "physical_screen_reader_or_system_font_tested": False,
    "cases": [],
    "limitations": [
        "Old commit renders a copied development-only fixture, not the actual 2026 production page.",
        "Browser visual comparison does not replace Android/iOS accessibility and external-app QA.",
        "Automatic image-diff metrics support, but do not replace, human visual approval.",
    ],
}

def digest(file: Path) -> str:
    return hashlib.sha256(file.read_bytes()).hexdigest()

def metrics(page):
    return page.evaluate("""() => {
      const main = document.querySelector('main[data-design]');
      const section = (key) => main.querySelector('[data-wedding-section="' + key + '"]');
      const transport = section('transport');
      const disclosure = transport.querySelector('details');
      const guide = transport.querySelector('[class*="guideSummary"]');
      const accounts = section('gift').querySelector('[class*="accountsContainer"]');
      const css = getComputedStyle(accounts);
      const surface = getComputedStyle(disclosure);
      const rect = main.getBoundingClientRect();
      const gallery = section('gallery');
      return {
        section_order: [...main.querySelectorAll('[data-wedding-section]')].map(el => el.dataset.weddingSection),
        overflow: document.documentElement.scrollWidth > innerWidth + 2,
        width: Math.round(rect.width * 10) / 10,
        left: Math.round(rect.left * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        contact: section('contact').querySelector('summary').textContent.trim(),
        contact_links: section('contact').querySelectorAll('a[href^="tel:"],a[href^="sms:"]').length,
        calendar: section('ceremony').querySelector('details > summary')?.textContent?.trim(),
        guide_summary: guide?.textContent?.trim(),
        guide_before_disclosure: !!guide && !!disclosure &&
          Boolean(guide.compareDocumentPosition(disclosure) & Node.DOCUMENT_POSITION_FOLLOWING),
        transport_summary: disclosure.querySelector('summary').textContent.trim(),
        transport_background: surface.backgroundColor,
        gift_border: [css.borderTopWidth,css.borderRightWidth,css.borderBottomWidth,css.borderLeftWidth],
        gift_surface: css.backgroundColor,
        gift_accounts: section('gift').querySelectorAll('details').length,
        gallery_images: gallery?.querySelectorAll('img').length || 0,
        gallery_variant: gallery?.querySelector('[data-gallery-variant]')?.dataset.galleryVariant ?? null,
        gallery_active_photo: !!gallery?.querySelector('.swiper-slide-active button[aria-label*="크게 보기"]'),
        guestbook_form: section('guestbook').querySelectorAll('form').length,
        guestbook_has_title: section('guestbook').textContent.includes('축하의 마음')
      };
    }""")

def paired_image(old_blob: bytes, new_blob: bytes, stem: str):
    old = Image.open(io.BytesIO(old_blob)).convert("RGB")
    new = Image.open(io.BytesIO(new_blob)).convert("RGB")
    height = max(old.height, new.height)
    width = max(old.width, new.width)
    aligned_old = Image.new("RGB", (width, height), "white")
    aligned_new = Image.new("RGB", (width, height), "white")
    aligned_old.paste(old, (0, 0))
    aligned_new.paste(new, (0, 0))
    difference = ImageChops.difference(aligned_old, aligned_new)
    mean = round(sum(ImageStat.Stat(difference).mean) / 3, 3)
    extrema = difference.convert("L").point(lambda x: 255 if x > 12 else 0)
    changed_bbox = extrema.getbbox()
    panel = Image.new("RGB", (width * 2 + 24, height + 64), "#eeeeee")
    panel.paste(aligned_old, (0, 64))
    panel.paste(aligned_new, (width + 24, 64))
    draw = ImageDraw.Draw(panel)
    font = ImageFont.load_default()
    draw.text((10, 20), "BEFORE / pre-A06", font=font, fill="black")
    draw.text((width + 34, 20), "AFTER / A07", font=font, fill="black")
    file = OUT / (stem + "-before-after.png")
    panel.save(file, optimize=True)
    return {
        "file": file.name, "sha256": digest(file),
        "before_size": [old.width, old.height],
        "after_size": [new.width, new.height],
        "mean_pixel_difference": mean,
        "has_visual_difference": changed_bbox is not None,
    }

def capture(locator):
    return locator.screenshot(animations="disabled", timeout=60000)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    try:
        for theme in THEMES:
            for width, height, density in SIZES:
                context = browser.new_context(
                    viewport={"width": width, "height": height},
                    device_scale_factor=density, locale="ko-KR",
                    reduced_motion="reduce", color_scheme="light",
                )
                old = context.new_page()
                new = context.new_page()
                errors = []
                old.on("pageerror", lambda error: errors.append("before: " + str(error)[:250]))
                new.on("pageerror", lambda error: errors.append("after: " + str(error)[:250]))
                record = {"theme": theme, "width": width, "passed": False, "comparison": []}
                try:
                    query = urlencode({
                        "qaTheme": theme, "qaUI07": "1",
                        "qaUI07Case": "full", "embed": "1",
                    })
                    for page, root in ((old, BEFORE), (new, AFTER)):
                        response = page.goto(
                            root + "/sample-invitation/?" + query,
                            wait_until="domcontentloaded", timeout=90000,
                        )
                        assert response and response.status == 200, (root, "HTTP")
                        page.locator(f'main[data-design="{theme}"]').wait_for(
                            state="visible", timeout=45000
                        )
                        page.locator('[data-wedding-section="guestbook"]').wait_for(
                            state="visible", timeout=30000
                        )
                        page.evaluate("document.fonts.ready")
                        page.add_style_tag(content="nextjs-portal { display: none !important; }")
                        page.wait_for_function("""() => {
                          const gallery = document.querySelector('[data-wedding-section="gallery"]');
                          const slider = gallery?.querySelector('[data-gallery-variant]');
                          const active = slider?.querySelector('.swiper-slide-active button[aria-label*="크게 보기"]');
                          return Boolean(slider && active && active.getBoundingClientRect().width > 0);
                        }""", timeout=20000)
                    a, b = metrics(old), metrics(new)
                    record["before"] = a
                    record["after"] = b
                    expected = ["invitation", "contact", "gallery", "ceremony",
                                "schedule", "transport", "gift", "guestbook"]
                    assert a["section_order"] == b["section_order"] == expected, "section order"
                    assert not a["overflow"] and not b["overflow"], "horizontal overflow"
                    assert a["contact_links"] == b["contact_links"] == 4, "contact action changed"
                    assert a["gift_accounts"] == b["gift_accounts"] == 2, "account action changed"
                    assert a["gallery_images"] > 0 and b["gallery_images"] > 0, "gallery images unavailable"
                    assert b["gallery_variant"] == theme and b["gallery_active_photo"], "new theme slider unavailable"
                    assert a["guestbook_form"] == b["guestbook_form"] == 1, "guestbook form changed"
                    assert a["guestbook_has_title"] and b["guestbook_has_title"], "guestbook title"
                    assert "연락처 확인" in b["contact"], "contact summary not improved"
                    assert "이 페이지에서 달력 확인" in (b["calendar"] or ""), "calendar semantics"
                    assert b["guide_before_disclosure"], "transport guide order"
                    assert "교통·방문 상세 내용 보기" in b["transport_summary"], "transport action"
                    assert b["transport_background"] not in TRANSPARENT, "missing transport panel"
                    if theme == "gyeol":
                        assert set(b["gift_border"]) == {"0px"}, "gyeol frame exception"
                        assert b["gift_surface"] not in TRANSPARENT, "gyeol paper missing"
                    else:
                        assert set(b["gift_border"]) == {"1px"}, "missing single gift frame"
                    assert b["height"] <= a["height"] * 1.15, "excessive page-length growth"
                    if width == 1440:
                        assert abs(a["width"] - 480) <= 2 and abs(b["width"] - 480) <= 2, "canvas width"
                        assert abs(b["left"] - 480) <= 2, "canvas centered"
                    targets = ALL_SECTIONS if width == 390 else ("transport", "gift", "guestbook")
                    for section in targets:
                        selector = f'[data-wedding-section="{section}"]'
                        old_blob = capture(old.locator(selector).first)
                        new_blob = capture(new.locator(selector).first)
                        comparison = paired_image(
                            old_blob, new_blob, f"{theme}-{width}-{section}"
                        )
                        record["comparison"].append({"section": section, **comparison})
                    record["page_errors"] = errors[:5]
                    assert not errors, errors
                    record["passed"] = True
                    print("A08_PAIR_OK", theme, width, len(record["comparison"]),
                          round(b["height"] - a["height"], 1), flush=True)
                except Exception as error:
                    record["error"] = type(error).__name__ + ": " + str(error)[:1500]
                    print("A08_PAIR_FAIL", theme, width, record["error"], flush=True)
                    try:
                        file = OUT / f"{theme}-{width}-failed.png"
                        new.screenshot(path=str(file), animations="disabled")
                        record["failure_screenshot"] = file.name
                    except Exception:
                        pass
                finally:
                    manifest["cases"].append(record)
                    context.close()
    finally:
        browser.close()

manifest["summary"] = {
    "passed": sum(row["passed"] for row in manifest["cases"]),
    "total": len(manifest["cases"]),
    "comparison_pairs": sum(len(row["comparison"]) for row in manifest["cases"]),
    "failed": [str(row.get("error")) for row in manifest["cases"] if not row["passed"]],
    "production_writes": 0,
}
(OUT / "manifest.json").write_text(
    json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)
print("A08_SUMMARY", json.dumps(manifest["summary"], ensure_ascii=False), flush=True)
if manifest["summary"]["passed"] != manifest["summary"]["total"]:
    raise SystemExit("A-08 same-data visual comparison failed")
