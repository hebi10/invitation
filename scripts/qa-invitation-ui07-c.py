#!/usr/bin/env python3
"""UI-07-C browser QA for contact actions and inline/ICS calendar semantics.

Uses synthetic development-only qaUI07 fixture, never Firebase customer data.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_UI07C_BASE", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/ui-07-c")
OUT.mkdir(parents=True, exist_ok=True)

THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")
VIEWPORTS = ((320, 740), (390, 844), (1440, 900))
CASES = ("full", "groom", "bride", "empty", "long")
REPORT = {
    "task": "UI-07-C",
    "source": "dev-only qaUI07 fictional invitation; no Firestore reads/writes",
    "real_customer_data": False,
    "physical_device": False,
    "created_utc": datetime.now(timezone.utc).isoformat(),
    "cases": [],
}


def capture(page, theme, width, variant, suffix, locator=None):
    file = OUT / f"{theme}-{width}-{variant}-{suffix}.png"
    if locator:
        locator.screenshot(path=str(file), animations="disabled", timeout=45000)
    else:
        page.screenshot(path=str(file), animations="disabled", timeout=45000)
    return {"file": file.name, "sha256": hashlib.sha256(file.read_bytes()).hexdigest(), "bytes": file.stat().st_size}



def wcag_contrast(background, foreground):
    def luminance(color):
        channels = [float(part) / 255 for part in re.findall(r"\d+(?:\.\d+)?", color)[:3]]
        assert len(channels) == 3, ("invalid RGB color", color)
        linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in channels]
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

    first, second = luminance(background), luminance(foreground)
    return round((max(first, second) + 0.05) / (min(first, second) + 0.05), 2)


def inspect_case(page, theme, width, variant, doubled, record):
    main = page.locator(f'main[data-design="{theme}"]')
    main.wait_for(state="visible", timeout=45000)
    page.evaluate("document.fonts.ready")
    page.add_style_tag(content="nextjs-portal { display:none !important; }")
    if doubled:
        page.evaluate("""() => {
          document.querySelectorAll('main[data-design] :is(h1,h2,h3,p,a,button,summary,li,span,strong,dt,dd)')
            .forEach(node => {
              const size = parseFloat(getComputedStyle(node).fontSize);
              if (Number.isFinite(size)) node.style.fontSize = (size * 2) + 'px';
            });
        }""")

    assert not page.evaluate("document.documentElement.scrollWidth > innerWidth + 2"), "horizontal scroll"
    contact = main.locator('[data-wedding-section="contact"]')
    expected_groups = 0 if variant == "empty" else 1 if variant in ("groom", "bride") else 2
    record["expected_groups"] = expected_groups
    assert contact.count() == (0 if variant == "empty" else 1)

    if expected_groups:
        assert not contact.locator('a[href^="tel:"]').first.is_visible(), "contact private actions exposed before open"
        summary = contact.locator("summary").first
        assert summary.bounding_box()["height"] >= 47.5, "contact summary 48px"
        summary.focus()
        page.keyboard.press("Enter")
        assert contact.get_attribute("open") is not None, "Enter did not expand contact"
        labels = [v.strip() for v in contact.locator('[data-contact-group-start="true"] [class*="contactSide"]').all_text_contents()]
        record["side_labels"] = labels
        assert len(labels) == expected_groups, ("side labels", labels, variant)
        expected_names = ["신랑측", "신부측"] if expected_groups == 2 else ["신랑측" if variant == "groom" else "신부측"]
        assert labels == expected_names, (labels, expected_names)
        assert contact.locator('[class*="contactSide"]').count() == expected_groups, "side label repeated on every row"
        phone_buttons = contact.locator('a[href^="tel:"], a[href^="sms:"]')
        assert phone_buttons.count() >= expected_groups * 2
        for i in range(phone_buttons.count()):
            item = phone_buttons.nth(i)
            name = item.get_attribute("aria-label") or ""
            assert any(side in name for side in expected_names), ("action side context", name)
            bounds = item.bounding_box()
            assert bounds and bounds["width"] >= 47.5 and bounds["height"] >= 47.5, ("tap target", name)
            assert item.get_attribute("href").startswith(("tel:", "sms:"))
        if width in (390, 1440) and not doubled:
            record["shots"].append(capture(page, theme, width, variant, "contact-open", contact))
        page.keyboard.press("Space")
        assert contact.get_attribute("open") is None, "Space did not collapse contact"
        assert not contact.locator('a[href^="tel:"]').first.is_visible(), "contact action visible after close"

    ceremony = main.locator('[data-wedding-section="ceremony"]')
    save = ceremony.get_by_role("button", name="캘린더에 저장")
    assert save.count() == 1, "ICS action must remain available"
    description_id = save.get_attribute("aria-describedby")
    assert description_id, "ICS description not announced to screen readers"
    assert page.evaluate("(id) => document.getElementById(id)?.textContent?.trim()", description_id) == "일정 파일(.ics) 다운로드"
    assert save.bounding_box()["height"] >= 71.5, "ICS action min 72px"
    disclosure = ceremony.locator("details")
    assert disclosure.count() == (0 if variant == "empty" else 1), "inline calendar conditional rendering"
    if theme == "classic-r":
        appearance = page.evaluate("""() => {
          const panel = document.querySelector('main[data-design="classic-r"] [data-wedding-section="ceremony"]');
          if (!panel) return null;
          const nodes = {
            heading: panel.querySelector('h2'),
            date: panel.querySelector('[class*="photoDate"] strong'),
            venue: panel.querySelector('[class*="venueName"]'),
            icsButton: panel.querySelector('button'),
            icsHint: panel.querySelector('button [class*="buttonHint"]'),
            calendarSummary: panel.querySelector('details > summary'),
            calendarTitle: panel.querySelector('details > summary [class*="summaryTitle"]'),
            calendarDescription: panel.querySelector('details > summary [class*="summaryDescription"]'),
          };
          const colors = Object.fromEntries(Object.entries(nodes)
            .filter(([, node]) => node)
            .map(([name, node]) => [name, getComputedStyle(node).color]));
          const heading = nodes.heading;
          if (heading) {
            colors.headingNumber = getComputedStyle(heading, '::before').color;
            colors.headingLabel = getComputedStyle(heading, '::after').color;
          }
          return { background: getComputedStyle(panel).backgroundColor, colors };
        }""")
        assert appearance, "modern ceremony panel missing"
        assert appearance["background"] == "rgb(25, 25, 23)", (
            "modern ceremony dark background regression", appearance["background"])
        required = {"heading", "date", "venue", "icsButton", "icsHint", "headingNumber", "headingLabel"}
        if variant != "empty":
            required |= {"calendarSummary", "calendarTitle", "calendarDescription"}
        assert required.issubset(appearance["colors"]), (
            "modern ceremony expected text missing", sorted(required - appearance["colors"].keys()))
        ratios = {name: wcag_contrast(appearance["background"], color)
                  for name, color in appearance["colors"].items()}
        assert all(ratio >= 4.5 for ratio in ratios.values()), (
            "modern ceremony WCAG AA contrast 4.5:1", ratios)
        record["modern_ceremony"] = {
            "background": appearance["background"], "contrast_ratios": ratios}
        if width == 390 and variant == "full" and not doubled:
            record["shots"].append(capture(page, theme, width, variant, "modern-dark-panel", ceremony))

    if disclosure.count():
        inline = disclosure.locator("summary")
        assert "이 페이지에서 달력 확인" in inline.inner_text()
        assert inline.bounding_box()["height"] >= 71.5, "inline calendar min 72px"
        assert not disclosure.locator('[data-public-invitation-feature="calendar-countdown"]').is_visible()
        inline.focus()
        page.keyboard.press("Enter")
        assert disclosure.get_attribute("open") is not None, "Enter did not expand inline calendar"
        assert disclosure.locator('[data-public-invitation-feature="calendar-countdown"]').is_visible()
        if width in (390, 1440) and not doubled:
            record["shots"].append(capture(page, theme, width, variant, "calendar-open", ceremony))
        page.keyboard.press("Space")
        assert disclosure.get_attribute("open") is None, "Space did not collapse inline calendar"

    if variant == "full" and width == 390 and not doubled:
        with page.expect_download(timeout=15000) as download_info:
            save.click()
        download = download_info.value
        assert download.suggested_filename == "wedding.ics", download.suggested_filename
        file = download.path()
        assert file is not None and file.is_file()
        exported = file.read_text(encoding="utf-8-sig")
        assert "BEGIN:VCALENDAR" in exported and "BEGIN:VEVENT" in exported
        assert "DTSTART" in exported and "SUMMARY" in exported
        record["ics_checked"] = True

    assert not page.evaluate("document.documentElement.scrollWidth > innerWidth + 2"), "overflow after interaction"
    if width >= 1440 and not doubled:
        panel = main.bounding_box()
        assert panel and abs(panel["width"] - 480) <= 2, "480px wedding canvas altered"
        assert abs(panel["x"] - (width - 480) / 2) <= 2, "wedding canvas not centered"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        scenarios = [(t, w, h, "full", False) for t in THEMES for w, h in VIEWPORTS]
        scenarios += [(t, 390, 844, case, False) for t in THEMES for case in CASES if case != "full"]
        scenarios += [(t, 390, 844, "full", True) for t in THEMES]

        for theme, width, height, variant, doubled in scenarios:
            ctx = browser.new_context(viewport={"width": width, "height": height},
                                      device_scale_factor=1 if width == 1440 else 2,
                                      locale="ko-KR", reduced_motion="reduce", accept_downloads=True)
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)[:350]))
            record = {"theme": theme, "width": width, "variant": variant, "text_200": doubled,
                      "passed": False, "shots": [], "ics_checked": False}
            try:
                query = urlencode({"qaTheme": theme, "qaUI07": "1", "qaUI07Case": variant, "embed": "1"})
                response = page.goto(f"{BASE}/sample-invitation/?{query}",
                                     wait_until="domcontentloaded", timeout=90000)
                assert response and response.status == 200, "fixture HTTP 200"
                inspect_case(page, theme, width, variant, doubled, record)
                assert not errors, errors
                record["passed"] = True
                print("UI07C_OK", theme, width, variant, "text2" if doubled else "normal", flush=True)
            except Exception as error:
                record["error"] = type(error).__name__ + ": " + str(error)[:1500]
                print("UI07C_FAIL", theme, width, variant, record["error"], flush=True)
                try:
                    record["shots"].append(capture(page, theme, width, variant, "failure"))
                except Exception:
                    pass
            finally:
                REPORT["cases"].append(record)
                ctx.close()
    finally:
        browser.close()

REPORT["summary"] = {
    "total": len(REPORT["cases"]),
    "passed": sum(bool(x["passed"]) for x in REPORT["cases"]),
    "screenshots": sum(len(x["shots"]) for x in REPORT["cases"]),
    "ics_downloads": sum(bool(x["ics_checked"]) for x in REPORT["cases"]),
    "failed": [x["error"] for x in REPORT["cases"] if not x["passed"]],
    "production_writes": 0,
}
(OUT / "manifest.json").write_text(json.dumps(REPORT, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("UI07C_SUMMARY", json.dumps(REPORT["summary"], ensure_ascii=False), flush=True)
if REPORT["summary"]["passed"] != REPORT["summary"]["total"]:
    raise SystemExit("UI-07-C contact/calendar browser QA failed")
