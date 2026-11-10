#!/usr/bin/env python3
"""UI-07-A-07: read-only fictional invitation responsiveness and accessibility QA."""
from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_LOCAL_BASE", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/ui-07-a07")
OUT.mkdir(parents=True, exist_ok=True)
THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")
VIEWPORTS = {"320": (320, 740), "390": (390, 844), "430": (430, 932), "768": (768, 1024), "1440": (1440, 900)}
CASES = ("full", "groom", "bride", "empty", "long")
FULL_SECTIONS = ("invitation", "contact", "gallery", "ceremony", "schedule", "transport", "gift", "guestbook")
REDUCED_SECTIONS = ("invitation", "ceremony", "schedule")
SUMMARY_SELECTORS = (
    '[data-wedding-section="contact"] > summary',
    '[data-wedding-section="ceremony"] details > summary',
    '[data-wedding-section="transport"] details > summary',
    '[data-wedding-section="gift"] details > summary',
    '[data-wedding-section="guestbook"] details > summary',
)
CONTRAST_SELECTORS = (
    '[data-wedding-section="contact"] [class*="summaryTitle"]',
    '[data-wedding-section="contact"] [class*="summaryDescription"]',
    '[data-wedding-section="transport"] [class*="guideSummary"]',
    '[data-wedding-section="transport"] details > summary',
    '[data-wedding-section="gift"] [class*="message"]',
    '[data-wedding-section="guestbook"] [class*="subtitle"]',
    '[data-wedding-section="guestbook"] [class*="formSummary"]',
)
LAYOUT_SCRIPT = r"""() => {
  const main = document.querySelector('main[data-design]');
  const sections = [...main.querySelectorAll('[data-wedding-section]')];
  const selectors = [
    '[data-wedding-section] h2',
    '[data-wedding-section="contact"] > summary',
    '[data-wedding-section="ceremony"] details > summary',
    '[data-wedding-section="transport"] details > summary',
    '[data-wedding-section="gift"] details > summary',
    '[data-wedding-section="guestbook"] details > summary',
    '[data-wedding-section="schedule"] .venueName',
    '[data-wedding-section="gift"] .accountNumber',
    '[data-wedding-section="gift"] .message'
  ];
  const candidates = [...main.querySelectorAll(selectors.join(','))];
  const clipped = candidates.filter(el => {
    if (!el.getClientRects().length) return false;
    const css = getComputedStyle(el);
    if (css.overflowX === 'visible' || css.whiteSpace === 'nowrap') return false;
    return el.scrollWidth > el.clientWidth + 3;
  }).map(el => ({node: el.tagName, className: String(el.className).slice(0, 90),
                  scroll: el.scrollWidth, client: el.clientWidth}));
  const box = main.getBoundingClientRect();
  const palette = getComputedStyle(main);
  return {
    section_order: sections.map(el => el.getAttribute('data-wedding-section')),
    horizontal_overflow: document.documentElement.scrollWidth > innerWidth + 2,
    overflow_amount: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    main_width: Math.round(box.width * 10) / 10,
    main_left: Math.round(box.left * 10) / 10,
    zoom: getComputedStyle(document.documentElement).zoom,
    clipped,
    reduced_motion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    font: palette.fontFamily,
    headings: sections.filter(el => el.querySelector('h2')).map(el => {
      const h = el.querySelector('h2');
      return {key: el.dataset.weddingSection, id: h.id, label: el.getAttribute('aria-labelledby')};
    }),
    contact_details: main.querySelectorAll('[data-wedding-section="contact"] > summary').length,
    contact_links: main.querySelectorAll('[data-wedding-section="contact"] a[href^="tel:"], [data-wedding-section="contact"] a[href^="sms:"]').length,
    gift_details: main.querySelectorAll('[data-wedding-section="gift"] details').length,
    gallery_buttons: main.querySelectorAll('[data-wedding-section="gallery"] button[aria-label*="크게 보기"]').length,
    calendar_details: main.querySelectorAll('[data-wedding-section="ceremony"] details').length,
    guestbook_form_details: main.querySelectorAll('[data-wedding-section="guestbook"] details').length
  };
}"""
COLOR_SCRIPT = r"""(selector) => {
  const node = document.querySelector('main[data-design] ' + selector);
  if (!node || !node.getClientRects().length) return null;
  let bg = 'rgba(0, 0, 0, 0)';
  for (let el = node; el; el = el.parentElement) {
    const candidate = getComputedStyle(el).backgroundColor;
    if (candidate && candidate !== 'transparent' && !candidate.endsWith(', 0)')) {
      bg = candidate;
      break;
    }
  }
  return {color: getComputedStyle(node).color, background: bg, label: (node.textContent || '').trim().slice(0, 42)};
}"""

manifest = {
    "task": "UI-07-A-07", "created_utc": datetime.now(timezone.utc).isoformat(),
    "commit": os.environ.get("GITHUB_SHA", "unknown"),
    "source": "isolated Next.js development-only qaUI07 fixture; no production Firebase",
    "no_actual_customer_data": True, "production_data_writes": 0,
    "external_phone_sms_payment_actions": 0, "physical_talkback_voiceover_tested": False,
    "map_in_fixture": False, "browser_text_zoom": "CSS zoom 200% at 768/1440; isolated text-only 200% at 390; not physical system font scaling",
    "cases": [], "limitations": [
        "Physical TalkBack/VoiceOver and on-device 200% system font are not simulated.",
        "Live Kakao map, phone/SMS, .ics calendar app, clipboard OS and guestbook submission are not invoked.",
        "Live production baseline and fictional fixture cannot be compared pixel-for-pixel."
    ]
}


def rgb(text: str):
    m = re.search(r"rgba?\(\s*(\d+(?:\.\d+)?)\s*,?\s+(\d+(?:\.\d+)?)\s*,?\s+(\d+(?:\.\d+)?)", text)
    if not m:
        raise AssertionError("Unsupported computed CSS color " + str(text))
    return tuple(float(m.group(i)) / 255.0 for i in (1, 2, 3))


def luminance(channels):
    vals = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2]


def contrast(foreground: str, background: str):
    a, b = luminance(rgb(foreground)), luminance(rgb(background))
    return round((max(a, b) + 0.05) / (min(a, b) + 0.05), 2)


def shot(page, stem: str, selector: str | None = None, full: bool = False):
    path = OUT / (stem + ".png")
    if selector:
        locator = page.locator(selector).first
        locator.screenshot(path=str(path), animations="disabled", timeout=60000)
    else:
        page.screenshot(path=str(path), full_page=full, animations="disabled", timeout=60000)
    raw = path.read_bytes()
    return {"file": path.name, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def focus_keyboard(page, selector: str, index: int = 0):
    summary = page.locator(selector).nth(index)
    summary.wait_for(state="visible", timeout=15000)
    parent = summary.locator("xpath=..")
    assert parent.evaluate("(el) => el.tagName === 'DETAILS'"), selector
    assert not parent.evaluate("(el) => el.open"), "Disclosure must start closed: " + selector
    summary.scroll_into_view_if_needed()
    summary.focus()
    page.keyboard.press("Tab")
    page.keyboard.press("Shift+Tab")
    current = summary.evaluate("""el => ({
        same: document.activeElement === el,
        visible: el.matches(':focus-visible'),
        outline: getComputedStyle(el).outlineStyle,
        width: parseFloat(getComputedStyle(el).outlineWidth),
        height: el.getBoundingClientRect().height
    })""")
    assert current["same"], "Tab/Shift+Tab focus order: " + selector
    assert current["visible"] and current["outline"] != "none" and current["width"] >= 1.5, ("Focus ring", selector, current)
    assert current["height"] >= 47.5, "Minimum 48px summary: " + selector
    page.keyboard.press("Enter")
    assert parent.evaluate("(el) => el.open"), "Enter open: " + selector
    page.keyboard.press("Space")
    assert not parent.evaluate("(el) => el.open"), "Space close: " + selector
    return current


def verify_case(page, theme: str, width: int, scenario: str, zoom: bool, record: dict, text_zoom: bool = False):
    main = page.locator('main[data-design="' + theme + '"]')
    main.wait_for(state="visible", timeout=35000)
    page.locator('[data-wedding-section="schedule"]').wait_for(state="visible", timeout=25000)
    page.evaluate("document.fonts.ready")
    page.add_style_tag(content="nextjs-portal { display: none !important; }")
    if zoom:
        page.evaluate("document.documentElement.style.zoom = '2'")
    if text_zoom:
        page.evaluate("""() => {
          const nodes = [...document.querySelectorAll(
            'main[data-design] :is(h1,h2,h3,p,a,button,summary,li,dt,dd,strong,span,label,input,textarea,figcaption,address)'
          )];
          const sizes = nodes.map(el => [el, parseFloat(getComputedStyle(el).fontSize)]);
          for (const [el, size] of sizes) {
            if (Number.isFinite(size)) el.style.fontSize = (size * 2) + 'px';
          }
        }""")
    metrics = page.evaluate(LAYOUT_SCRIPT)
    record["metrics"] = metrics
    expected = list(REDUCED_SECTIONS if scenario == "empty" else FULL_SECTIONS)
    assert metrics["section_order"] == expected, (scenario, metrics["section_order"])
    assert not metrics["horizontal_overflow"], ("horizontal overflow", metrics["overflow_amount"], scenario, width)
    assert not metrics["clipped"], ("clipped text", metrics["clipped"])
    assert metrics["reduced_motion"], "Reduced-motion media query not active"
    assert main.get_attribute("aria-label"), "Main must identify invitation"
    for heading in metrics["headings"]:
        if heading["label"]:
            assert heading["id"] and heading["id"] == heading["label"], heading
    if scenario == "empty":
        assert metrics["contact_links"] == metrics["gift_details"] == 0
        assert metrics["calendar_details"] == metrics["guestbook_form_details"] == 0
    elif scenario in ("groom", "bride"):
        assert metrics["gift_details"] == 1, (scenario, metrics)
        assert metrics["contact_links"] == 2, (scenario, metrics)
        contact_summary = page.locator('[data-wedding-section="contact"] > summary').inner_text()
        assert ("신랑측" if scenario == "groom" else "신부측") in contact_summary
        assert ("신부측" if scenario == "groom" else "신랑측") not in contact_summary
    else:
        assert metrics["gift_details"] == 2, (scenario, metrics)
        assert metrics["contact_links"] == 4, (scenario, metrics)
    if width >= 768 and not zoom:
        assert abs(metrics["main_width"] - 480) <= 2
        assert abs(metrics["main_left"] - (width - 480) / 2) <= 2
    if zoom:
        assert metrics["zoom"] == "2", metrics["zoom"]
    if scenario != "empty":
        contact = page.locator('[data-wedding-section="contact"]')
        assert not contact.locator('a[href^="tel:"]').first.is_visible(), "Collapsed contact exposed phone link"
        gift = page.locator('[data-wedding-section="gift"]')
        assert not gift.locator('[class*="accountNumber"]').first.is_visible(), "Collapsed account exposed number"
        assert page.locator('[data-wedding-section="guestbook"] form').count() == 1
        assert not page.locator('[data-wedding-section="guestbook"] form').is_visible(), "Collapsed guestbook form exposed"
    if scenario == "long":
        assert len(page.locator('[data-wedding-section="transport"] [class*="guideSummary"]').inner_text()) > 10
        assert len(page.locator('[data-wedding-section="gift"] [class*="message"]').inner_text()) > 100

    for selector in CONTRAST_SELECTORS:
        colors = page.evaluate(COLOR_SCRIPT, selector)
        if not colors:
            continue
        ratio = contrast(colors["color"], colors["background"])
        record.setdefault("contrast", []).append({"element": selector, "ratio": ratio})
        assert ratio >= 4.5, ("normal text contrast", theme, selector, ratio)
    if scenario == "full" and not zoom and width == 390:
        keyboard_checks = 0
        for selector in SUMMARY_SELECTORS:
            focus_keyboard(page, selector)
            keyboard_checks += 1
        focus_keyboard(page, SUMMARY_SELECTORS[3], index=1)
        keyboard_checks += 1
        record["keyboard_checks"] = keyboard_checks
        gallery_button = page.locator('[data-wedding-section="gallery"] button[aria-label*="크게 보기"]').first
        if gallery_button.count():
            gallery_button.scroll_into_view_if_needed()
            gallery_button.click(timeout=15000)
            dialog = page.get_by_role("dialog", name=re.compile("크게 보기"))
            dialog.wait_for(state="visible", timeout=15000)
            assert dialog.get_attribute("aria-modal") == "true"
            page.keyboard.press("Escape")
            dialog.wait_for(state="hidden", timeout=15000)
            assert gallery_button.evaluate("(el) => document.activeElement === el"), "Gallery focus restoration"
            record["gallery_checked"] = True

    stem = theme + "-" + ("text2-" if text_zoom else "zoom2-" if zoom else "") + str(width) + "-" + scenario
    if scenario == "full" and not zoom:
        record["screenshots"].append(shot(page, stem + "-top"))
        if width == 390:
            record["screenshots"].append(shot(page, stem + "-full", full=True))
    elif scenario == "empty":
        record["screenshots"].append(shot(page, stem + "-no-optional"))
    elif zoom or text_zoom:
        record["screenshots"].append(shot(page, stem + "-scaled"))
    else:
        section = "contact" if scenario in ("groom", "bride") else "transport"
        record["screenshots"].append(shot(page, stem + "-" + section, selector='[data-wedding-section="' + section + '"]'))


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        scenarios = [
            (theme, width, height, "full", False, False)
            for theme in THEMES for _, (width, height) in VIEWPORTS.items()
        ] + [
            (theme, 390, 844, scenario, False, False)
            for theme in THEMES for scenario in CASES if scenario != "full"
        ] + [
            (theme, width, height, "full", True, False)
            for theme in THEMES for width, height in (VIEWPORTS["768"], VIEWPORTS["1440"])
        ] + [
            (theme, 390, 844, "full", False, True)
            for theme in THEMES
        ]
        for theme, width, height, scenario, zoom, text_zoom in scenarios:
            ctx = browser.new_context(
                viewport={"width": width, "height": height},
                device_scale_factor=1 if width >= 768 else 2,
                locale="ko-KR", reduced_motion="reduce", color_scheme="light"
            )
            page = ctx.new_page()
            page_errors = []
            page.on("pageerror", lambda e: page_errors.append(str(e)[:350]))
            row = {"theme": theme, "width": width, "case": scenario, "zoom_200": zoom, "text_zoom_200": text_zoom,
                   "success": False, "screenshots": [], "keyboard_checks": 0, "gallery_checked": False}
            try:
                query = urlencode({"qaTheme": theme, "qaUI07": "1", "qaUI07Case": scenario, "embed": "1"})
                response = page.goto(BASE + "/sample-invitation/?" + query,
                                     wait_until="domcontentloaded", timeout=90000)
                assert response is not None and response.status == 200, "Fictional fixture HTTP 200"
                verify_case(page, theme, width, scenario, zoom, row, text_zoom=text_zoom)
                assert not page_errors, page_errors
                row["success"] = True
                print("A07_OK", theme, width, scenario, "text2" if text_zoom else "zoom2" if zoom else "normal", flush=True)
            except Exception as error:
                row["error"] = type(error).__name__ + ": " + str(error)[:1800]
                print("A07_FAIL", theme, width, scenario, "text2" if text_zoom else "zoom2" if zoom else "normal", row["error"], flush=True)
                try:
                    row["screenshots"].append(shot(page, theme + "-" + str(width) + "-" + scenario + "-error"))
                except Exception:
                    pass
            finally:
                manifest["cases"].append(row)
                ctx.close()
    finally:
        browser.close()

manifest["summary"] = {
    "passed": sum(bool(case["success"]) for case in manifest["cases"]),
    "total": len(manifest["cases"]),
    "keyboard_checks": sum(case["keyboard_checks"] for case in manifest["cases"]),
    "gallery_checks": sum(bool(case["gallery_checked"]) for case in manifest["cases"]),
    "images": sum(len(case["screenshots"]) for case in manifest["cases"]),
    "failed": [{"theme": case["theme"], "case": case["case"], "width": case["width"], "zoom": case["zoom_200"],
                "text_zoom_200": case["text_zoom_200"], "error": case.get("error")} for case in manifest["cases"] if not case["success"]],
}
(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("A07_SUMMARY", json.dumps(manifest["summary"], ensure_ascii=False), flush=True)
if manifest["summary"]["passed"] != manifest["summary"]["total"]:
    raise SystemExit("UI-07-A-07 accessibility QA failed; inspect screenshot/manifest")
