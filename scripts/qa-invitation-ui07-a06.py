#!/usr/bin/env python3
"""Chromium QA for UI-07-A-06 using a dev-only fictional wedding fixture."""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_LOCAL_BASE", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/ui-07-a06")
OUT.mkdir(parents=True, exist_ok=True)
THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")
VIEWPORTS = {
    "mobile320": (320, 740, 2),
    "mobile390": (390, 844, 2),
    "mobile430": (430, 932, 2),
    "tablet768": (768, 1024, 1),
    "desktop1440": (1440, 900, 1),
}
SECTIONS = ("invitation", "contact", "gallery", "ceremony", "schedule", "transport", "gift", "guestbook")
manifest = {
    "task": "UI-07-A-06",
    "source": "Next.js development server + fictional sample; no Firebase write/read",
    "qa_parameter": "qaUI07=1 enabled only outside production",
    "production_customer_data_used": False,
    "physical_device_tested": False,
    "created_utc": datetime.now(timezone.utc).isoformat(),
    "cases": [],
}


def snapshot(page, theme: str, screen: str, section: str | None = None, full: bool = False):
    filename = f"{theme}-{screen}" + (f"-{section}" if section else "-full") + ".png"
    target = OUT / filename
    if section:
        page.locator(f'[data-wedding-section="{section}"]').first.screenshot(
            path=str(target), animations="disabled", timeout=60000
        )
    else:
        page.screenshot(path=str(target), full_page=full, animations="disabled", timeout=60000)
    blob = target.read_bytes()
    return {"file": filename, "bytes": len(blob), "sha256": hashlib.sha256(blob).hexdigest()}


def check_disclosure_keyboard(page, selector: str):
    summary = page.locator(selector).first
    summary.wait_for(state="visible", timeout=20000)
    parent = summary.locator("xpath=..")
    assert parent.evaluate("(el) => el.tagName === 'DETAILS'"), selector
    assert not parent.evaluate("(el) => el.open"), "fixture should initially be collapsed: " + selector
    assert summary.bounding_box()["height"] >= 47.5, "48px hit target: " + selector

    summary.focus()
    assert summary.evaluate("(el) => document.activeElement === el")
    page.keyboard.press("Enter")
    assert parent.evaluate("(el) => el.open"), "Enter must open: " + selector
    page.keyboard.press("Space")
    assert not parent.evaluate("(el) => el.open"), "Space must close: " + selector


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        for theme in THEMES:
            for screen, (width, height, scale) in VIEWPORTS.items():
                ctx = browser.new_context(
                    viewport={"width": width, "height": height},
                    device_scale_factor=scale, locale="ko-KR",
                    reduced_motion="reduce", color_scheme="light",
                )
                page = ctx.new_page()
                errors = []
                page.on("pageerror", lambda e: errors.append(str(e)[:400]))
                record = {
                    "theme": theme, "viewport": screen, "width": width,
                    "success": False, "screenshots": [], "disclosure_tests": 0,
                }
                try:
                    response = page.goto(
                        f"{BASE}/sample-invitation/?qaTheme={theme}&qaUI07=1&embed=1",
                        wait_until="domcontentloaded", timeout=90000,
                    )
                    assert response is not None and response.status == 200
                    main = page.locator(f'main[data-design="{theme}"]')
                    main.wait_for(state="visible", timeout=40000)
                    page.locator('[data-wedding-section="guestbook"]').wait_for(
                        state="visible", timeout=25000
                    )
                    page.evaluate("document.fonts.ready")
                    page.add_style_tag(content="nextjs-portal { display: none !important; }")
                    data = page.evaluate("""() => {
                      const main = document.querySelector('main[data-design]');
                      const section = (name) => main.querySelector('[data-wedding-section="' + name + '"]');
                      const gift = section('gift')?.querySelector('[class*="accountsContainer"]');
                      const transport = section('transport');
                      const guideSummary = transport?.querySelector('[class*="guideSummary"]');
                      const disclosure = transport?.querySelector('details');
                      const c = getComputedStyle(gift);
                      const t = getComputedStyle(disclosure);
                      const m = main.getBoundingClientRect();
                      return {
                        sectionOrder: [...main.querySelectorAll('[data-wedding-section]')]
                          .map(el => el.getAttribute('data-wedding-section')),
                        hasOverflow: document.documentElement.scrollWidth > innerWidth + 1,
                        mainWidth: m.width, mainLeft: m.left,
                        transportBackground: t.backgroundColor,
                        transportSummaryBeforeDetails: !!guideSummary &&
                          !!disclosure && Boolean(guideSummary.compareDocumentPosition(disclosure) & Node.DOCUMENT_POSITION_FOLLOWING),
                        accountCount: section('gift')?.querySelectorAll('details').length,
                        accountBorder: [c.borderTopWidth,c.borderRightWidth,c.borderBottomWidth,c.borderLeftWidth],
                        accountSurface: c.backgroundColor,
                        contactSummary: section('contact')?.querySelector('summary')?.textContent?.trim(),
                        calendarSummary: section('ceremony')?.querySelector('details > summary')?.textContent?.trim(),
                        panelPadding: getComputedStyle(main).getPropertyValue('--ui07-panel-padding-inline').trim(),
                      }
                    }""")
                    record["metrics"] = data
                    assert data["sectionOrder"] == list(SECTIONS), data
                    assert not data["hasOverflow"], data
                    assert data["accountCount"] == 2, data
                    assert "신랑측·신부측 연락처 확인" in data["contactSummary"], data
                    assert "이 페이지에서 달력 확인" in data["calendarSummary"], data
                    assert data["transportSummaryBeforeDetails"], data
                    assert data["transportBackground"] not in ("transparent", "rgba(0, 0, 0, 0)"), data
                    if theme == "gyeol":
                        assert all(b == "0px" for b in data["accountBorder"]), data
                        assert data["accountSurface"] not in ("transparent", "rgba(0, 0, 0, 0)"), data
                    else:
                        assert all(b == "1px" for b in data["accountBorder"]), data
                    assert data["panelPadding"] == ("16px" if width <= 359 else "20px"), data
                    if width >= 768:
                        assert abs(data["mainWidth"] - 480) <= 2, data
                        assert abs(data["mainLeft"] - (width - 480) / 2) <= 2, data

                    if screen in ("mobile390", "desktop1440"):
                        for section in ("transport", "gift", "guestbook"):
                            record["screenshots"].append(snapshot(page, theme, screen, section=section))
                    if screen == "mobile390":
                        record["screenshots"].append(snapshot(page, theme, screen, full=True))
                        selectors = (
                            '[data-wedding-section="contact"] > summary',
                            '[data-wedding-section="ceremony"] details > summary',
                            '[data-wedding-section="transport"] details > summary',
                            '[data-wedding-section="gift"] details > summary',
                            '[data-wedding-section="guestbook"] details > summary',
                        )
                        for selector in selectors:
                            check_disclosure_keyboard(page, selector)
                            record["disclosure_tests"] += 1
                        assert page.locator('[data-wedding-section="gift"] details').count() == 2
                    record["pageerrors"] = errors[:4]
                    assert not errors, errors
                    record["success"] = True
                    print("A06_BROWSER_OK",theme,screen,json.dumps({
                        "sections":len(data["sectionOrder"]),
                        "giftBorder":data["accountBorder"],
                        "keyboard":record["disclosure_tests"],
                    },ensure_ascii=False),flush=True)
                except Exception as e:
                    record["error"] = type(e).__name__ + ": " + str(e)[:1600]
                    print("A06_BROWSER_FAIL",theme,screen,record["error"],flush=True)
                finally:
                    manifest["cases"].append(record)
                    ctx.close()
    finally:
        browser.close()

manifest["summary"] = {
    "passed": sum(row["success"] for row in manifest["cases"]),
    "total": len(manifest["cases"]),
    "screenshots": sum(len(row["screenshots"]) for row in manifest["cases"]),
    "keyboard_disclosure_groups": sum(row["disclosure_tests"] for row in manifest["cases"]),
    "production_data_writes": 0,
}
(OUT / "manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("A06_BROWSER_SUMMARY",json.dumps(manifest["summary"],ensure_ascii=False),flush=True)
if manifest["summary"]["passed"] != len(THEMES) * len(VIEWPORTS):
    raise SystemExit("A06 browser validation failed; inspect redacted fictional sample evidence")
