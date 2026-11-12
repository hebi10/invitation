#!/usr/bin/env python3
"""UI-R08-VISUAL-05: isolated full-page and functional acceptance of five sold wedding themes.

All data is fictional. No production Firebase, payment, external maps, SMS, or guestbook writes.
Browser evidence is not a physical-device or screen-reader certification.
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_R08_BASE", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/ui-r08-visual05")
OUT.mkdir(parents=True, exist_ok=True)
THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")
SIZES = ((320, 740), (360, 780), (390, 844), (430, 932), (768, 1024), (1440, 900))
ORDER = ("invitation", "contact", "gallery", "ceremony", "schedule", "transport", "gift", "guestbook")
SECTIONS = ("invitation", "contact", "gallery", "ceremony", "schedule", "transport", "gift", "guestbook")
REPORT = {
    "task": "UI-R08-VISUAL-05",
    "head": os.environ.get("GITHUB_SHA", "unavailable"),
    "design_reference": "Google Drive Invitation five-theme mobile restrained-concept plan 2026-11-11",
    "source": "local dev-only synthetic sample; real Next.js + Chromium",
    "physical_devices": False,
    "real_screen_reader": False,
    "real_external_apps": False,
    "production_reads_writes": 0,
    "real_payments": 0,
    "guestbook_submissions": 0,
    "created_utc": datetime.now(timezone.utc).isoformat(),
    "cases": [],
}

def save(page, filename, *, selector=None, full=False):
    target = OUT / filename
    if selector:
        page.locator(selector).first.screenshot(path=str(target), animations="disabled", timeout=60000)
    else:
        page.screenshot(path=str(target), full_page=full, animations="disabled", timeout=60000)
    raw = target.read_bytes()
    return {"name": filename, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}

def no_horizontal_overflow(page):
    widths = page.evaluate("""() => ({
      page: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      viewport: innerWidth
    })""")
    assert widths["page"] <= widths["viewport"] + 2, ("horizontal overflow", widths)
    return widths

def cover_check(main, theme, no_cover=False):
    cover = main.locator("section[data-cover-position]").first
    assert cover.count() == 1
    assert cover.locator("h1").count() == 1
    assert cover.get_attribute("aria-labelledby")
    assert main.locator("h1").count() == 1
    assert "이서준" in cover.inner_text() and "김하은" in cover.inner_text()
    frame = cover.locator("[data-wedding-cover-frame]")
    assert frame.count() == (0 if no_cover else 1), ("photo optional", theme)
    if frame.count():
        img = frame.locator("img[data-wedding-cover-photo]")
        assert img.count() == 1
        img.wait_for(state="visible")
        assert img.evaluate("(el) => el.complete && el.naturalWidth > 0")
        assert "50%" in img.evaluate("(el) => getComputedStyle(el).objectPosition")
    if theme == "classic-r" and frame.count():
        assert cover.get_attribute("data-cover-position") == "bottom"
        assert frame.locator("h1").count() == 1
        assert frame.locator("[data-wedding-editorial-photo-meta]").count() == 1
    if theme == "gyeol":
        classic = cover.locator("[data-wedding-traditional-frame]")
        assert classic.count() == 1
        assert classic.get_attribute("data-wedding-traditional-frame") is not None
        assert cover.get_attribute("data-cover-has-photo") == ("false" if no_cover else "true")
        if frame.count():
            overlap = cover.evaluate("""(node) => {
              const p = node.querySelector('[data-wedding-cover-frame]').getBoundingClientRect();
              const f = node.querySelector('[data-wedding-traditional-frame]').getBoundingClientRect();
              return Math.round((p.bottom - f.top) * 10) / 10;
            }""")
            assert overlap > 10, ("classic frame overlap", overlap)
    if theme == "romantic" and frame.count():
        assert cover.get_attribute("data-cover-position") == "bottom"
    if theme == "emotional":
        assert cover.locator('[class*="letterSprig"]').count() == 1
    return cover

def check_full(page, main, theme, width, row):
    order = main.locator("[data-wedding-section]").evaluate_all(
        "(nodes) => nodes.map(n => n.dataset.weddingSection)"
    )
    assert order == list(ORDER), ("section reading order", order)
    for target in ("#wedding-info", "#wedding-location", "#wedding-gallery"):
        assert main.locator('nav[aria-label="청첩장 바로가기"] a[href="' + target + '"]').count() == 1
        assert main.locator(target).count() == 1
    quick = main.locator('nav[aria-label="청첩장 바로가기"] a')
    assert quick.count() == 3
    assert all(quick.nth(i).locator('svg[aria-hidden="true"]').count() == 1 for i in range(3))
    hero = cover_check(main, theme)

    ceremony = main.locator('[data-wedding-section="ceremony"]')
    assert "2027" in ceremony.inner_text() and "메종 가든" in ceremony.inner_text()
    assert ceremony.get_by_role("button", name="캘린더에 저장").count() == 1
    calendar = ceremony.locator("details")
    assert calendar.count() == 1 and calendar.get_attribute("open") is None
    schedule = main.locator('[data-wedding-section="schedule"]')
    assert "메종 가든" in schedule.inner_text()
    assert schedule.locator('[class*="scheduleContent"]').count() == 1
    if theme == "classic-r":
        assert ceremony.evaluate("(el) => getComputedStyle(el).backgroundColor") == "rgb(25, 25, 23)"
    if theme == "simple":
        assert ceremony.locator("dl").count() == 1
    if theme == "emotional":
        assert ceremony.locator('[class*="gardenDate"]').count() >= 1

    contact = main.locator('[data-wedding-section="contact"]')
    gift = main.locator('[data-wedding-section="gift"]')
    guest = main.locator('[data-wedding-section="guestbook"]')
    assert contact.locator("details, summary").count() >= 1
    assert gift.locator("details").count() == 2
    assert guest.locator("details").count() == 1
    assert all(d.get_attribute("open") is None for d in gift.locator("details").all())
    assert not gift.locator('[class*="accountNumber"]').first.is_visible(), "private account number exposed"
    assert not guest.locator("form").is_visible(), "guestbook form expanded on first view"
    assert guest.locator('[class*="commentItem"]').count() == 3
    assert guest.locator('[class*="authorName"]').first.count() == 1
    assert guest.locator('[class*="commentDate"]').first.count() == 1
    assert guest.locator('[class*="commentMessage"]').first.count() == 1
    closing = page.locator('[data-wedding-closing][data-theme="' + theme + '"]')
    assert closing.count() == 1
    assert "이서준" in closing.inner_text() and "김하은" in closing.inner_text()
    assert "감사" in closing.inner_text(), ("closing copy", theme)

    gallery = main.locator('[data-wedding-section="gallery"]')
    slider = gallery.locator('[data-gallery-variant="' + theme + '"]')
    assert slider.count() == 1
    assert slider.locator(".swiper-slide").count() >= 5
    nav = slider.locator("[data-gallery-navigation]")
    assert nav.count() == 1
    assert nav.locator('[role="status"]').inner_text().strip() == "01 / 05"
    assert nav.get_by_role("button", name="이전 사진").is_disabled()
    assert nav.get_by_role("button", name="다음 사진").is_enabled()
    if width == 390:
        nav.get_by_role("button", name="다음 사진").click()
        page.wait_for_function("""() =>
          document.querySelector('[data-gallery-navigation] [role=status]')?.textContent?.trim() === '02 / 05'""")
        nav.get_by_role("button", name="이전 사진").click()
        page.wait_for_function("""() =>
          document.querySelector('[data-gallery-navigation] [role=status]')?.textContent?.trim() === '01 / 05'""")
        trigger = gallery.locator('.swiper-slide-active button[aria-label*="크게 보기"]').first
        trigger.scroll_into_view_if_needed()
        trigger.click()
        dialog = page.locator('[role="dialog"][aria-modal="true"]').last
        dialog.wait_for(state="visible", timeout=15000)
        page.keyboard.press("Escape")
        dialog.wait_for(state="hidden", timeout=15000)
        assert trigger.evaluate("(el) => document.activeElement === el"), "gallery focus restore"
        with page.expect_download(timeout=15000) as download_event:
            ceremony.get_by_role("button", name="캘린더에 저장").click()
        download = download_event.value
        assert download.suggested_filename == "wedding.ics"
        contents = download.path().read_text(encoding="utf-8-sig")
        assert "BEGIN:VCALENDAR" in contents and "BEGIN:VEVENT" in contents
        row["ics_download"] = True
        calendar.locator("summary").click()
        assert calendar.get_attribute("open") is not None
        calendar.locator("summary").click()
        assert calendar.get_attribute("open") is None
        for item in gift.locator("details").all():
            item.locator("summary").click()
            assert item.get_attribute("open") is not None
            assert item.locator('[class*="accountHolder"]').count() >= 1
            assert item.locator('[class*="accountNumber"]').first.is_visible()
            assert item.locator("button[aria-label*='계좌번호 복사']").count() >= 1
            item.locator("summary").click()
            assert not item.locator('[class*="accountNumber"]').first.is_visible()
        form = guest.locator("details")
        form.locator("summary").click()
        assert guest.locator("form").is_visible()
        assert guest.locator("form").evaluate("(f) => !f.checkValidity()")
        form.locator("summary").click()
        assert not guest.locator("form").is_visible()
        # Reusable CSS-state evidence without populating/modifying any account, comment, or payment.
        for section in SECTIONS:
            row["images"].append(save(page, theme + "-390-" + section + ".png",
                                      selector='[data-wedding-section="' + section + '"]'))
        row["images"].append(save(page, theme + "-390-cover.png", selector="section[data-cover-position]"))
        row["images"].append(save(page, theme + "-390-closing.png", selector='[data-wedding-closing]'))
    row["images"].append(save(page, theme + "-" + str(width) + "-full.png", full=True))
    return {"sections": len(order), "guestbook_comments": 3, "gallery_images": 5,
            "title": hero.get_attribute("data-cover-position"), "closing": theme}

def check_variant(page, main, theme, variant, row):
    cover_check(main, theme, no_cover=(variant == "no-cover"))
    if variant in ("groom", "bride"):
        gift = main.locator('[data-wedding-section="gift"]')
        assert gift.locator("details").count() == 1
        assert gift.locator("details").first.get_attribute("open") is None
    elif variant == "empty":
        for section in ("gallery", "gift", "contact", "guestbook", "transport"):
            assert main.locator('[data-wedding-section="' + section + '"]').count() == 0
        assert main.locator('[data-wedding-section="ceremony"]').count() == 1
        assert main.locator('[data-wedding-section="schedule"]').count() == 1
    elif variant == "long":
        assert len(main.locator('[data-wedding-section="invitation"]').inner_text()) > 150
    elif variant == "no-cover":
        assert main.locator("h1").count() == 1
        assert not main.locator("[data-wedding-cover-frame]").count()
    elif variant.startswith("gallery-"):
        count = int(variant.split("-")[-1])
        assert main.locator('[data-wedding-section="gallery"]').count() == (1 if count else 0)
        quick = main.locator('nav[aria-label="청첩장 바로가기"] a[href="#wedding-gallery"]')
        assert quick.count() == (1 if count else 0)
        if count:
            gallery = main.locator('[data-wedding-section="gallery"]')
            slider = gallery.locator("[data-gallery-variant]")
            assert slider.locator(".swiper-slide").count() == count
            nav = gallery.locator("[data-gallery-navigation]")
            assert nav.count() == (1 if count > 1 or (theme == "gyeol" and count == 1) else 0)
    row["images"].append(save(page, theme + "-390-" + variant + ".png", full=True))

def check_zoom(page, main, theme, row):
    page.evaluate("""() => {
      for (const el of document.querySelectorAll(
        'main[data-design] :is(h1,h2,h3,p,a,button,summary,li,span,strong,dt,dd,address)'
      )) {
        const original = parseFloat(getComputedStyle(el).fontSize);
        if (Number.isFinite(original)) el.style.fontSize = (original * 2) + 'px';
      }
    }""")
    assert main.locator("h1").count() == 1
    assert main.locator('[data-wedding-section="gift"] details').count() == 2
    row["images"].append(save(page, theme + "-390-text200.png", full=True))

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        cases = [(theme, w, h, "full") for theme in THEMES for w, h in SIZES]
        cases += [(theme, 390, 844, variant) for theme in THEMES
                  for variant in ("groom", "bride", "empty", "long", "no-cover")]
        cases += [(theme, 390, 844, "gallery-" + str(n)) for theme in THEMES for n in (0, 1, 2, 3)]
        cases += [(theme, 390, 844, "text200") for theme in THEMES]
        for theme, width, height, variant in cases:
            context = browser.new_context(
                viewport={"width": width, "height": height},
                device_scale_factor=1 if width >= 768 else 2,
                locale="ko-KR", reduced_motion="reduce", accept_downloads=True,
                permissions=["clipboard-read", "clipboard-write"],
            )
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)[:400]))
            case = {"theme": theme, "width": width, "variant": variant,
                    "passed": False, "images": [], "ics_download": False}
            try:
                params = {"qaTheme": theme, "qaUI07": "1", "qaUI07Case": "full",
                          "qaUI07Map": "off", "embed": "1"}
                if variant in ("groom", "bride", "empty", "long"):
                    params["qaUI07Case"] = variant
                elif variant.startswith("gallery-"):
                    params["qaR08GalleryCount"] = variant.split("-")[-1]
                elif variant == "no-cover":
                    params["qaR08NoCover"] = "1"
                response = page.goto(BASE + "/sample-invitation/?" + urlencode(params),
                                     wait_until="domcontentloaded", timeout=90000)
                assert response and response.status == 200, "local fictional sample HTTP 200"
                main = page.locator('main[data-design="' + theme + '"]')
                main.wait_for(state="visible", timeout=45000)
                page.evaluate("document.fonts.ready")
                page.add_style_tag(content="nextjs-portal { display:none !important; }")
                if variant == "full":
                    case["metrics"] = check_full(page, main, theme, width, case)
                elif variant == "text200":
                    cover_check(main, theme)
                    check_zoom(page, main, theme, case)
                else:
                    check_variant(page, main, theme, variant, case)
                case["widths"] = no_horizontal_overflow(page)
                assert not errors, errors
                case["passed"] = True
                print("R08_VISUAL05_OK", theme, width, variant, flush=True)
            except Exception as error:
                case["error"] = type(error).__name__ + ": " + str(error)[:1500]
                print("R08_VISUAL05_FAIL", theme, width, variant, case["error"], flush=True)
                try:
                    case["images"].append(save(page, theme + "-" + str(width) + "-" + variant + "-failed.png"))
                except Exception:
                    pass
            finally:
                REPORT["cases"].append(case)
                context.close()
    finally:
        browser.close()

REPORT["summary"] = {
    "total": len(REPORT["cases"]),
    "passed": sum(bool(row["passed"]) for row in REPORT["cases"]),
    "failed": [{"theme": row["theme"], "width": row["width"],
                "variant": row["variant"], "error": row.get("error")}
               for row in REPORT["cases"] if not row["passed"]],
    "full_width_cases": 5 * len(SIZES),
    "edge_cases": 5 * (5 + 4 + 1),
    "screen_images": sum(len(row["images"]) for row in REPORT["cases"]),
    "ics_downloads": sum(bool(row.get("ics_download")) for row in REPORT["cases"]),
    "production_reads_writes": 0,
}
(OUT / "manifest.json").write_text(json.dumps(REPORT, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("R08_VISUAL05_SUMMARY", json.dumps(REPORT["summary"], ensure_ascii=False), flush=True)
if REPORT["summary"]["passed"] != REPORT["summary"]["total"]:
    raise SystemExit("UI-R08-VISUAL-05 final design QA failed; inspect artifact")
