#!/usr/bin/env python3
"""UI-09-04: fictional guestbook browser QA, never writes customer data."""
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_LOCAL_BASE", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/ui-09-04")
OUT.mkdir(parents=True, exist_ok=True)
THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")
SIZES = ((320, 740), (390, 844), (768, 1024), (1440, 900))
GUESTBOOK = '[data-wedding-section="guestbook"]'
manifest = {
    "task": "UI-09-04",
    "source": "Development-only fictional sample with demoComments, no Firebase writes",
    "live_customer_data": False,
    "production_writes": 0,
    "physical_device_or_screen_reader_tested": False,
    "cases": [],
}

def capture(page, theme, label):
    path = OUT / (theme + "-" + label + ".png")
    page.locator(GUESTBOOK).screenshot(path=str(path), animations="disabled", timeout=30000)
    return {
        "name": path.name,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "bytes": path.stat().st_size,
    }

def inspect(page, theme, width):
    metrics = page.evaluate("""() => {
      const section = document.querySelector('[data-wedding-section="guestbook"]');
      const cards = [...section.querySelectorAll('[class*="commentItem"]')];
      const get = el => el ? getComputedStyle(el) : null;
      const outer = section.getBoundingClientRect();
      const data = cards.map(card => {
        const header = card.querySelector('[class*="commentHeader"]');
        const author = card.querySelector('[class*="authorName"]');
        const date = card.querySelector('[class*="commentDate"]');
        const message = card.querySelector('[class*="commentMessage"]');
        const rect = card.getBoundingClientRect();
        return {
          hasHeader: !!header, hasAuthor: !!author && !!author.textContent.trim(),
          hasDate: !!date && !!date.textContent.trim(), hasMessage: !!message && !!message.textContent.trim(),
          authorBeforeMessage: !!author && !!message && !!(author.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING),
          authorAboveMessage: !!author && !!message && author.getBoundingClientRect().top <= message.getBoundingClientRect().top,
          dateBesideAuthor: !!date && !!author && Math.abs(date.getBoundingClientRect().top - author.getBoundingClientRect().top) <= 16,
          width: rect.width, left: rect.left, right: rect.right,
          border: get(card).borderTopWidth, surface: get(card).backgroundColor,
          authorColor: get(author)?.color, messageColor: get(message)?.color,
        };
      });
      const pageButtons = [...section.querySelectorAll('nav[aria-label="방명록 페이지"] button')];
      return {
        theme: document.querySelector('main[data-design]')?.dataset.design,
        scrollWidth: document.documentElement.scrollWidth,
        viewport: innerWidth, sectionLeft: outer.left, sectionRight: outer.right,
        cards: data,
        details: section.querySelector('details') !== null,
        summaryHeight: section.querySelector('details > summary')?.getBoundingClientRect().height,
        pageButtons: pageButtons.map(el => ({height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width})),
        prefersReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
      };
    }""")
    assert metrics["theme"] == theme, metrics
    assert metrics["scrollWidth"] <= width + 2, metrics
    assert metrics["details"] and metrics["summaryHeight"] >= 44, metrics
    assert metrics["prefersReducedMotion"], metrics
    assert len(metrics["cards"]) == 3, metrics
    for card in metrics["cards"]:
        assert all(card[k] for k in ("hasHeader", "hasAuthor", "hasDate", "hasMessage", "authorBeforeMessage", "authorAboveMessage", "dateBesideAuthor")), card
        assert card["left"] >= metrics["sectionLeft"] - 2 and card["right"] <= metrics["sectionRight"] + 2, card
        assert card["border"] != "0px", card
    return metrics

def exercise(page, theme):
    section = page.locator(GUESTBOOK)
    summary = section.locator("details > summary").first
    summary.scroll_into_view_if_needed()
    summary.focus()
    assert summary.evaluate("(el) => document.activeElement === el")
    page.keyboard.press("Enter")
    form = section.locator("form")
    form.wait_for(state="visible", timeout=10000)
    name = form.locator('input[type="text"]')
    body = form.locator("textarea")
    submit = form.locator('button[type="submit"]')
    assert name.get_attribute("maxlength") == "20"
    assert body.get_attribute("maxlength") == "500"
    assert submit.evaluate("(el) => el.getBoundingClientRect().height >= 47.5")
    for index in range(3):
        name.fill("가상 검증 하객")
        message = ("읽기 편한 긴 축하 메시지입니다. 한글 줄바꿈과 띄어쓰기가 카드 안에서 자연스럽게 표시되어야 합니다. " * 5) if index == 0 else "행복한 결혼 생활을 기원합니다. " + str(index)
        body.fill(message)
        submit.click()
        section.get_by_text("샘플 글을 추가했습니다", exact=False).wait_for(state="visible", timeout=10000)
    assert section.locator('[class*="commentItem"]').count() == 5, "First page must show five records"
    pager = section.get_by_role("navigation", name="방명록 페이지")
    pager.wait_for(state="visible", timeout=10000)
    next_button = pager.get_by_role("button", name="다음")
    previous_button = pager.get_by_role("button", name="이전")
    assert previous_button.is_disabled() and next_button.is_enabled()
    for button in (next_button, previous_button):
        assert button.evaluate("(el) => el.getBoundingClientRect().height >= 43.5"), "44px page touch target"
    next_button.click()
    pager.get_by_role("button", name="2페이지").wait_for(state="visible", timeout=10000)
    assert pager.get_by_role("button", name="2페이지").get_attribute("aria-current") == "page"
    assert section.locator('[class*="commentItem"]').count() == 1, "Second page must preserve one record"
    assert next_button.is_disabled()
    previous_button.click()
    assert pager.get_by_role("button", name="1페이지").get_attribute("aria-current") == "page"
    assert section.locator('[class*="commentItem"]').count() == 5
    summary.focus()
    page.keyboard.press("Space")
    assert not form.is_visible(), "Space must collapse the authoring form"
    return {"demo_submissions": 3, "pagination_roundtrip": True, "keyboard_summary": True}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        for theme in THEMES:
            for width, height in SIZES:
                for zoom in (False, True) if width == 390 else (False,):
                    ctx = browser.new_context(
                        viewport={"width": width, "height": height},
                        locale="ko-KR",
                        reduced_motion="reduce",
                        color_scheme="light",
                    )
                    page = ctx.new_page()
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)[:300]))
                    row = {"theme": theme, "width": width, "zoom_200": zoom, "passed": False}
                    try:
                        query = urlencode({"qaTheme": theme, "qaUI07": "1", "embed": "1"})
                        response = page.goto(BASE + "/sample-invitation/?" + query, wait_until="domcontentloaded", timeout=90000)
                        assert response and response.status == 200, "Fictional sample must be HTTP 200"
                        section = page.locator(GUESTBOOK)
                        section.wait_for(state="visible", timeout=40000)
                        page.evaluate("document.fonts.ready")
                        page.add_style_tag(content="nextjs-portal { display: none !important; }")
                        if zoom:
                            page.evaluate("document.documentElement.style.zoom='2'")
                        row["metrics"] = inspect(page, theme, width)
                        row["screenshots"] = [capture(page, theme, str(width) + ("-zoom200" if zoom else "") + "-cards")]
                        if width == 390 and not zoom:
                            row["interaction"] = exercise(page, theme)
                            row["screenshots"].append(capture(page, theme, "390-after-pagination"))
                        assert not errors, errors
                        row["passed"] = True
                        print("UI09_04_OK", theme, width, "zoom200" if zoom else "normal", flush=True)
                    except Exception as exc:
                        row["error"] = type(exc).__name__ + ": " + str(exc)[:1800]
                        print("UI09_04_FAIL", theme, width, row["error"], flush=True)
                        try:
                            row.setdefault("screenshots", []).append(capture(page, theme, str(width) + "-error"))
                        except Exception:
                            pass
                    finally:
                        manifest["cases"].append(row)
                        ctx.close()
    finally:
        browser.close()
manifest["summary"] = {
    "passed": sum(int(item["passed"]) for item in manifest["cases"]),
    "total": len(manifest["cases"]),
    "interaction_cases": sum(int(bool(item.get("interaction"))) for item in manifest["cases"]),
}
(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("UI09_04_SUMMARY", json.dumps(manifest["summary"], ensure_ascii=False), flush=True)
if manifest["summary"]["passed"] != manifest["summary"]["total"]:
    raise SystemExit("UI-09-04 browser QA failed")
