#!/usr/bin/env python3
"""Read-only, browser-emulated QA for five public wedding themes.

This is not a physical Android/iOS device test. It never submits a guestbook form,
invokes Kakao sharing, changes Firebase data, or purchases anything.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

OUTPUT = Path("artifacts/public-wedding-stage5")
OUTPUT.mkdir(parents=True, exist_ok=True)
AXE = Path("artifacts/axe-core-4.10.3.min.js")
THEMES = (
    ("simple", "01-basic"),
    ("classic-r", "02-modern"),
    ("romantic", "03-photo"),
    ("gyeol", "04-classic"),
    ("emotional", "05-natural"),
)
WIDTHS = (320, 360, 390, 430, 600, 840, 1280, 1440)
SCREENSHOT_WIDTHS = {320, 390, 600, 840, 1440}
BASE = "https://invite.msgnote.kr/shin-minje-kim-hyunji"
VIOLATIONS = []
RESULTS = []
MOBILE_TOUCH = []
DESKTOP_KEYS = []
AXE_RESULTS = []


def open_invitation(page, theme: str):
    url = f"{BASE}/{theme}/"
    resp = page.goto(url, wait_until="domcontentloaded", timeout=60000)
    if not resp or resp.status != 200:
        raise AssertionError(f"{theme}: public URL returned {resp.status if resp else 'none'}")
    page.get_by_text("김현지", exact=False).first.wait_for(timeout=25000)
    introduction = page.get_by_role("dialog", name="결혼식 초대장 인트로")
    if introduction.count() and introduction.first.is_visible():
        page.get_by_role("button", name="건너뛰기").first.click(timeout=12000)
    page.evaluate("document.fonts.ready")
    page.locator('button[aria-label^="음악 "]').first.wait_for(state="visible", timeout=22000)
    page.wait_for_timeout(300)
    return url


def inspect_viewport(page):
    return page.evaluate("""() => {
        const w = window.innerWidth;
        const root = document.querySelector('main[data-design]');
        const rect = root?.getBoundingClientRect();
        const controls = [...document.querySelectorAll('main[data-design] a, main[data-design] button, main[data-design] summary')];
        const small = controls.filter(el => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            if (!r.width || !r.height || s.display === 'none' || s.visibility === 'hidden') return false;
            // A Swiper carousel intentionally positions non-active slides outside the viewport.
            if (r.left < -1 || r.right > w + 1) return false;
            return r.width < 43.5 || r.height < 43.5;
        }).map(el => ({
            label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 75),
            width: Math.round(el.getBoundingClientRect().width),
            height: Math.round(el.getBoundingClientRect().height),
        })).slice(0, 15);
        return {
            width: w,
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            mainWidth: rect ? Math.round(rect.width) : 0,
            mainCentered: rect ? Math.abs(rect.left - (w - rect.width) / 2) < 3 : false,
            smallControls: small,
            quickLinks: [...document.querySelectorAll('nav[aria-label="청첩장 바로가기"] a')]
                .map(a => a.getAttribute('href')),
            music: Boolean(document.querySelector('button[aria-label^="음악 "]')),
            gallery: Boolean(document.getElementById('wedding-gallery')),
            ceremony: Boolean(document.getElementById('wedding-info')),
            location: Boolean(document.getElementById('wedding-location')),
            closing: Boolean(document.querySelector('[data-wedding-closing]')),
            guestbook: Boolean(document.querySelector('[data-wedding-section="guestbook"]')),
            kakaoButton: [...document.querySelectorAll('button')].some(b =>
                (b.textContent || '').includes('카카오톡 공유')),
        };
    }""")


def audit_accessibility(page, theme: str, width: int):
    data = page.evaluate("""async () => {
        if (!window.axe) throw Error('Axe audit library unavailable');
        const result = await axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        });
        return {
            violations: result.violations.map(v => ({
                id: v.id, impact: v.impact, nodes: v.nodes.length,
                examples: v.nodes.slice(0, 5).map(n => ({
                    target: n.target, summary: n.failureSummary,
                })),
            })),
            incomplete: result.incomplete.map(v => ({
                id: v.id, impact: v.impact, nodes: v.nodes.length,
                examples: v.nodes.slice(0, 5).map(n => ({
                    target: n.target, html: n.html.slice(0, 240),
                })),
            })),
            passes: result.passes.length,
        };
    }""")
    data.update(theme=theme, width=width)
    AXE_RESULTS.append(data)
    if data["violations"]:
        VIOLATIONS.append(f"{theme}/{width}: axe violations={len(data['violations'])}")
    print(f"STAGE5_AXE {theme} {width}: violations={len(data['violations'])} "
          f"incomplete={len(data['incomplete'])}", flush=True)


def inspect_gallery_interactions(page, theme: str):
    gallery = page.locator('[data-wedding-section="gallery"]')
    trigger = gallery.locator('button[aria-label*="번째 사진 크게 보기"]').first
    trigger.wait_for(timeout=14000)
    trigger.scroll_into_view_if_needed(timeout=10000)
    trigger.click(timeout=15000)
    dialog = page.locator('[role="dialog"][aria-modal="true"]').filter(
        has=page.get_by_role("button", name="갤러리 크게 보기 닫기")
    ).first
    dialog.wait_for(state="visible", timeout=10000)
    page.screenshot(path=str(OUTPUT / f"{theme}-gallery-dialog.jpg"), type="jpeg",
                    quality=79, animations="disabled")
    focus_inside = page.evaluate("""() => Boolean(
        document.activeElement?.closest('[role="dialog"][aria-modal="true"]')
    )""")
    if not focus_inside:
        VIOLATIONS.append(f"{theme}: gallery focus did not move into dialog")
    counter = dialog.locator('span[aria-live="polite"][aria-atomic="true"]').last
    before = counter.inner_text(timeout=8000).strip()
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(220)
    after = counter.inner_text(timeout=8000).strip()
    if before == after:
        VIOLATIONS.append(f"{theme}: ArrowRight did not advance the gallery image")
    page.keyboard.press("Tab")
    focus_trapped = page.evaluate("""() => Boolean(
        document.activeElement?.closest('[role="dialog"][aria-modal="true"]')
    )""")
    if not focus_trapped:
        VIOLATIONS.append(f"{theme}: Tab escaped gallery dialog")
    page.keyboard.press("Escape")
    try:
        dialog.wait_for(state="hidden", timeout=8000)
    except PlaywrightTimeout:
        VIOLATIONS.append(f"{theme}: Escape did not close the gallery")
    focus_restored = page.evaluate("""() => {
        const node = document.activeElement;
        return Boolean(node && node.getAttribute('aria-label')?.includes('번째 사진 크게 보기'));
    }""")
    if not focus_restored:
        VIOLATIONS.append(f"{theme}: gallery close did not restore focus to a photo button")
    summary = {
        "theme": theme, "dialogOpened": True, "focusInside": focus_inside,
        "arrowRightAdvanced": before != after, "tabFocusTrapped": focus_trapped,
        "escapeClosed": not dialog.is_visible(), "focusRestored": focus_restored,
    }
    DESKTOP_KEYS.append(summary)
    print("STAGE5_GALLERY " + json.dumps(summary, ensure_ascii=False), flush=True)


def inspect_touch_simulation(browser, theme: str):
    ctx = browser.new_context(
        viewport={"width": 390, "height": 844}, device_scale_factor=1,
        is_mobile=True, has_touch=True, locale="ko-KR", reduced_motion="reduce",
    )
    page = ctx.new_page()
    try:
        open_invitation(page, theme)
        gallery = page.locator('[data-wedding-section="gallery"]')
        button = gallery.locator('button[aria-label*="번째 사진 크게 보기"]').first
        button.wait_for(timeout=15000)
        button.scroll_into_view_if_needed(timeout=10000)
        button.tap(timeout=15000)
        dialog = page.locator('[role="dialog"][aria-modal="true"]').filter(
            has=page.get_by_role("button", name="갤러리 크게 보기 닫기")
        ).first
        dialog.wait_for(state="visible", timeout=10000)
        close = page.get_by_role("button", name="갤러리 크게 보기 닫기")
        close.tap(timeout=15000)
        dialog.wait_for(state="hidden", timeout=10000)
        info = {"theme": theme, "touchEmulation": True, "dialogOpens": True, "dialogCloses": True}
        MOBILE_TOUCH.append(info)
        print("STAGE5_TOUCH " + json.dumps(info), flush=True)
    finally:
        ctx.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
    try:
        if not AXE.is_file():
            raise FileNotFoundError("Pinned axe-core fixture was not downloaded")
        for theme, stem in THEMES:
            context = browser.new_context(
                viewport={"width": 390, "height": 844}, device_scale_factor=1,
                locale="ko-KR", color_scheme="light", reduced_motion="reduce",
                bypass_csp=True,
            )
            page = context.new_page()
            page_errors = []
            page.on("pageerror", lambda e: page_errors.append(str(e)[:220]))
            try:
                url = open_invitation(page, theme)
                page.add_script_tag(content=AXE.read_text(encoding="utf-8"))
                sizes = []
                for width in WIDTHS:
                    page.set_viewport_size({"width": width, "height": 844 if width <= 430 else 900})
                    page.wait_for_timeout(170)
                    result = inspect_viewport(page)
                    sizes.append(result)
                    if result["documentWidth"] > width + 1 or result["bodyWidth"] > width + 1:
                        VIOLATIONS.append(f"{theme}/{width}: horizontal page overflow")
                    if width > 480 and not result["mainCentered"]:
                        VIOLATIONS.append(f"{theme}/{width}: 480px invitation not centered")
                    if result["smallControls"]:
                        VIOLATIONS.append(f"{theme}/{width}: touch targets below 44px: "
                                          f"{result['smallControls'][:3]}")
                    needed = ("music", "gallery", "ceremony", "location", "closing", "guestbook", "kakaoButton")
                    missing = [key for key in needed if not result[key]]
                    if missing:
                        VIOLATIONS.append(f"{theme}/{width}: missing UI {missing}")
                    if result["quickLinks"][:2] != ["#wedding-info", "#wedding-location"]:
                        VIOLATIONS.append(f"{theme}/{width}: quick navigation order changed")
                    if width in SCREENSHOT_WIDTHS:
                        page.screenshot(
                            path=str(OUTPUT / f"{stem}-{width}.jpg"), type="jpeg",
                            quality=80, full_page=(width == 390), animations="disabled",
                            timeout=60000,
                        )
                    if width in (390, 1440):
                        audit_accessibility(page, theme, width)
                page.set_viewport_size({"width": 390, "height": 844})
                inspect_gallery_interactions(page, theme)
                RESULTS.append({"theme": theme, "url": url, "httpStatus": 200,
                                "viewportTests": sizes, "pageErrors": page_errors[:6]})
                print(f"STAGE5_RESPONSIVE {theme} 8/8 width inspections finished", flush=True)
            except Exception as error:
                VIOLATIONS.append(f"{theme}: {type(error).__name__}: {error}")
                print(f"STAGE5_FAILURE {theme}: {error}", flush=True)
            finally:
                context.close()
            try:
                inspect_touch_simulation(browser, theme)
            except Exception as error:
                VIOLATIONS.append(f"{theme}: touch emulation failed: {error}")
                print(f"STAGE5_TOUCH_FAILURE {theme}: {error}", flush=True)
    finally:
        browser.close()

manifest = {
    "capturedAt": datetime.now(timezone.utc).isoformat(),
    "source": "Live public Firebase-hosted wedding invitation (read-only)",
    "browser": "GitHub Actions Ubuntu Chromium via Playwright",
    "notPerformed": [
        "Physical Android or iOS device operation",
        "TalkBack or VoiceOver on hardware",
        "KakaoTalk share reception by a real user",
        "Real billing/Firebase privileged production-account operations",
    ],
    "responsiveWidths": list(WIDTHS),
    "themes": RESULTS, "axe": AXE_RESULTS,
    "keyboardDialogs": DESKTOP_KEYS, "emulatedTouch": MOBILE_TOUCH,
    "issues": VIOLATIONS, "passed": not VIOLATIONS,
}
(OUTPUT / "qa-manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
(OUTPUT / "SUMMARY.md").write_text(
    "# Invitation public wedding — Stage 5 QA\n\n"
    f"Rendered themes: {len(RESULTS)}/5\n"
    f"Viewport checks: {sum(len(entry['viewportTests']) for entry in RESULTS)}/40\n"
    f"WCAG axe scans: {len(AXE_RESULTS)}/10\n"
    f"Gallery keyboard tests: {len(DESKTOP_KEYS)}/5\n"
    f"Browser touch emulations: {len(MOBILE_TOUCH)}/5\n"
    f"Issues: {len(VIOLATIONS)}\n\n"
    + ("\n".join(f"- {issue}" for issue in VIOLATIONS) if VIOLATIONS else "No blocking issues.")
    + "\n\n**Not a physical-device test.** See qa-manifest.json for incomplete/manual axe checks.\n",
    encoding="utf-8",
)
print(f"STAGE5_COMPLETE rendered={len(RESULTS)} "
      f"axes={len(AXE_RESULTS)} touch={len(MOBILE_TOUCH)} "
      f"issues={len(VIOLATIONS)}", flush=True)
if VIOLATIONS:
    raise SystemExit(1)
