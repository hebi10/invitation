#!/usr/bin/env python3
"""UI-07-F integrated browser acceptance: fictional five-theme wedding only.

Checks real React/Next.js DOM and interaction across B-E.
Map and audio methods are deterministic in-browser test doubles;
NO real outbound Kakao/phone/SMS, payment, or customer database writes.
This is a browser test, NOT a physical Android/iOS device test.
"""
from __future__ import annotations

import ast
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_UI07F_BASE", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/ui-07-f/browser")
OUT.mkdir(parents=True, exist_ok=True)
THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")
SIZES = ((320, 740), (390, 844), (768, 1024), (1440, 900))
FULL_ORDER = ("invitation", "contact", "gallery", "ceremony", "schedule",
              "transport", "gift", "guestbook")
MIN_ORDER = ("invitation", "ceremony", "schedule")


def mock_constant(path, identifier):
    """Re-use already verified mocks without running their stand-alone QA."""
    tree = ast.parse(Path(path).read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == identifier
            for target in node.targets
        ):
            return ast.literal_eval(node.value)
    raise AssertionError(f"Missing existing test double: {identifier}")


MAP_MOCK = mock_constant("scripts/qa-invitation-ui07-d.py", "FAKE_KAKAO_SDK")
AUDIO_MOCK = mock_constant("scripts/qa-invitation-ui07-e.py", "FAKE_AUDIO")

report = {
    "task": "Invitation UI-07-F integration",
    "source": "local development-only fictional sample, with map/audio test doubles",
    "created_utc": datetime.now(timezone.utc).isoformat(),
    "physical_device": False,
    "real_kakao_sdk": False,
    "real_audio": False,
    "real_phone_sms_navigation": False,
    "real_payment_or_guestbook_submission": False,
    "production_reads_and_writes": 0,
    "cases": [],
}


def shot(page, stem, selector=None, full=False):
    file = OUT / (stem + ".png")
    if selector:
        page.locator(selector).first.screenshot(path=str(file), animations="disabled", timeout=45000)
    else:
        page.screenshot(path=str(file), full_page=full, animations="disabled", timeout=45000)
    return {"file": file.name, "sha256": hashlib.sha256(file.read_bytes()).hexdigest(),
            "bytes": file.stat().st_size}


def assert_no_overflow(page):
    check = page.evaluate("""() => ({
      document: document.documentElement.scrollWidth,
      viewport: innerWidth,
      body: document.body.scrollWidth
    })""")
    assert check["document"] <= check["viewport"] + 2, ("Horizontal page overflow", check)


def press_summary(page, summary, expected):
    summary.scroll_into_view_if_needed()
    summary.focus()
    page.keyboard.press("Enter")
    assert summary.locator("xpath=..").get_attribute("open") is not None, "Enter did not expand disclosure"
    page.keyboard.press("Space")
    assert summary.locator("xpath=..").get_attribute("open") is None, "Space did not collapse disclosure"
    if expected:
        summary.click()
        assert summary.locator("xpath=..").get_attribute("open") is not None


def full_case(page, theme, width, scenario, row):
    main = page.locator(f'main[data-design="{theme}"]')
    main.wait_for(state="visible", timeout=40000)
    page.evaluate("document.fonts.ready")
    page.add_style_tag(content="nextjs-portal { display: none !important }")

    if scenario == "text200":
        page.evaluate("""() => {
          const nodes = document.querySelectorAll(
            'main[data-design] :is(h1,h2,h3,p,a,button,summary,li,span,strong,input,textarea,dt,dd)'
          );
          nodes.forEach(node => {
            const size = parseFloat(getComputedStyle(node).fontSize);
            if (Number.isFinite(size)) node.style.fontSize = size * 2 + 'px';
          });
        }""")

    items = main.locator("[data-wedding-section]").evaluate_all(
        "(nodes) => nodes.map(node => node.dataset.weddingSection)"
    )
    assert items == list(MIN_ORDER if scenario == "empty" else FULL_ORDER), items
    assert_no_overflow(page)

    if width >= 768:
        box = main.bounding_box()
        assert box and abs(box["width"] - 480) < 2, box
        assert abs(box["x"] - (width - 480) / 2) < 2, box
    if scenario == "empty":
        assert main.locator('[data-wedding-section="contact"]').count() == 0
        assert main.locator('[data-wedding-section="guestbook"]').count() == 0
        assert main.locator('[data-wedding-section="gift"]').count() == 0
        assert main.locator('[data-wedding-section="gallery"]').count() == 0
        return

    for href in ("#wedding-info", "#wedding-location", "#wedding-gallery"):
        assert main.locator('nav[aria-label="청첩장 바로가기"] a[href="' + href + '"]').count() == 1
        assert main.locator(href).count() == 1

    contact = main.locator('[data-wedding-section="contact"]')
    assert not contact.locator('a[href^="tel:"]').first.is_visible()
    contact_summary = contact.locator("summary").first
    press_summary(page, contact_summary, True)
    contacts = contact.locator('a[href^="tel:"],a[href^="sms:"]')
    assert contacts.count() >= 2
    if scenario == "groom" or scenario == "bride":
        assert contacts.count() == 2
        assert (("신랑측" if scenario == "groom" else "신부측") in contact_summary.inner_text())
    else:
        assert contacts.count() >= 4
    for link in contacts.all():
        h = link.get_attribute("href")
        a = link.get_attribute("aria-label")
        assert h.startswith(("tel:", "sms:")) and a and "측" in a
    contact_summary.click()
    assert not contact.locator('a[href^="tel:"]').first.is_visible()

    ceremony = main.locator('[data-wedding-section="ceremony"]')
    save = ceremony.get_by_role("button", name="캘린더에 저장")
    assert save.count() == 1
    calendar = ceremony.locator("details")
    assert not calendar.locator('[data-public-invitation-feature="calendar-countdown"]').is_visible()
    press_summary(page, calendar.locator("summary").first, True)
    assert calendar.locator('[data-public-invitation-feature="calendar-countdown"]').is_visible()
    if width == 390 and scenario == "full":
        with page.expect_download(timeout=15000) as event:
            save.click()
        downloaded = event.value
        assert downloaded.suggested_filename == "wedding.ics"
        body = downloaded.path().read_text(encoding="utf-8-sig")
        assert "BEGIN:VCALENDAR" in body and "BEGIN:VEVENT" in body
        assert "DTSTART" in body and "SUMMARY" in body
        row["ics_verified"] = True
    calendar.locator("summary").first.click()

    gallery = main.locator('[data-wedding-section="gallery"]')
    trigger = gallery.locator('button[aria-label*="번째 사진 크게 보기"]').first
    trigger.wait_for(state="visible", timeout=15000)
    trigger.scroll_into_view_if_needed()
    trigger.click()
    dialog = page.locator('[role="dialog"][aria-modal="true"]').last
    dialog.wait_for(state="visible", timeout=15000)
    assert dialog.get_by_role("button", name="갤러리 크게 보기 닫기").is_visible()
    page.keyboard.press("Escape")
    dialog.wait_for(state="hidden", timeout=15000)
    assert trigger.evaluate("(element) => document.activeElement === element"), "Gallery trigger focus not restored"

    section = main.locator('[data-wedding-section="schedule"]')
    map_box = section.locator("[data-map-status]")
    map_box.scroll_into_view_if_needed()
    map_box.locator('[data-map-status="ready"]').count() if False else None
    page.locator('[data-map-status="ready"]').wait_for(state="visible", timeout=18000)
    assert map_box.locator('button[aria-pressed]').count() == 1
    assert map_box.locator('nav[aria-label="지도 바로가기"] a').count() == 2
    for anchor in map_box.locator('nav[aria-label="지도 바로가기"] a').all():
        assert anchor.get_attribute("href").startswith("https://map.kakao.com/")
        assert "noopener" in (anchor.get_attribute("rel") or "")
    control = map_box.locator('button[aria-pressed]')
    assert control.get_attribute("aria-pressed") == "false"
    control.click()
    assert control.get_attribute("aria-pressed") == "true"
    control.focus()
    page.keyboard.press("Escape")
    assert control.get_attribute("aria-pressed") == "false"

    gift = main.locator('[data-wedding-section="gift"]')
    details = gift.locator("details")
    assert details.count() == (1 if scenario in ("groom", "bride") else 2)
    for detail in details.all():
        assert detail.get_attribute("open") is None
        detail.locator("summary").click()
        assert detail.get_attribute("open") is not None
    first_copy = gift.locator('button[aria-label*="계좌번호 복사"]').first
    if first_copy.count() and width == 390 and scenario == "full":
        first_copy.click()
        assert first_copy.is_visible()
        row["synthetic_clipboard_control_clicked"] = True

    guest = main.locator('[data-wedding-section="guestbook"]')
    form_disclosure = guest.locator('details[class*="formDisclosure"]')
    assert form_disclosure.count() == 1
    assert not guest.locator("form").is_visible()
    form_disclosure.locator("summary").click()
    form = guest.locator("form")
    assert form.is_visible()
    assert form.locator("input[required]").count() >= 1
    assert form.locator("textarea[required]").count() == 1
    assert form.evaluate("(element) => element.checkValidity()") is False
    row["guestbook_submissions"] = 0

    music = page.locator('[class*="musicPlayer"][class*="invitationAligned"]').first
    music.wait_for(state="visible", timeout=15000)
    player = music.locator('button[data-wedding-music-state]')
    page.wait_for_function("""() => {
      const audio = document.querySelector('audio');
      return !!audio && Math.abs(audio.volume - 0.35) < 0.01;
    }""", timeout=20000)
    assert player.get_attribute("aria-pressed") == "false"
    assert player.locator('[data-wedding-music-icon="paused"]').count() == 1
    player.click()
    assert player.get_attribute("aria-pressed") == "true"
    assert player.locator('[data-wedding-music-icon="playing"]').count() == 1
    player.click()
    assert player.get_attribute("aria-pressed") == "false"
    assert_no_overflow(page)

    if width == 390 and scenario == "full":
        for name, selector in (
            ("contact", '[data-wedding-section="contact"]'),
            ("ceremony", '[data-wedding-section="ceremony"]'),
            ("location", '[data-wedding-section="schedule"]'),
            ("gift", '[data-wedding-section="gift"]'),
            ("guestbook", '[data-wedding-section="guestbook"]'),
        ):
            row["screens"].append(shot(page, f"{theme}-{width}-{name}", selector=selector))
        row["screens"].append(shot(page, f"{theme}-{width}-full", full=True))
    elif scenario == "text200":
        row["screens"].append(shot(page, f"{theme}-{width}-font200"))
    elif width == 1440 and scenario == "full":
        row["screens"].append(shot(page, f"{theme}-{width}-cover"))


def intro_case(page, theme, style, row):
    main = page.locator(f'main[data-design="{theme}"]')
    main.wait_for(state="visible", timeout=30000)
    intro = page.locator(f'[data-wedding-intro="{style}"]')
    intro.wait_for(state="visible", timeout=16000)
    assert intro.get_attribute("role") == "dialog"
    assert intro.get_attribute("aria-modal") == "true"
    music = page.locator('[class*="musicPlayer"][class*="invitationAligned"]').first
    button = music.locator('button[aria-pressed]')
    if button.count() > 0:
        point = button.bounding_box()
        if point:
            assert page.evaluate("""args => {
              const node = document.elementFromPoint(args.x, args.y);
              return !!node?.closest('[data-wedding-intro]');
            }""", {"x": point["x"] + 20, "y": point["y"] + 20}), "Intro should cover music button"

    if style == "cinema":
        photo = intro.locator("[data-intro-photo]")
        assert photo.count() == 1
        photo_object = photo.evaluate("(el) => getComputedStyle(el).objectPosition")
        cover_object = page.locator("[data-wedding-cover-photo]").first.evaluate(
            "(el) => getComputedStyle(el).objectPosition"
        )
        assert photo_object == cover_object, ("Intro/cover photo crop drift", theme)
    if style == "envelope":
        open_button = intro.get_by_role("button", name="초대장 열기")
        assert open_button.is_visible()
        open_button.click()
    else:
        intro.get_by_role("button", name="건너뛰기").click()
    intro.wait_for(state="detached", timeout=6000)
    assert not page.locator("[data-wedding-intro-pending]").count()
    assert not page.evaluate("document.body.style.overflow === 'hidden'")
    assert main.is_visible()
    assert main.locator('nav[aria-label="청첩장 바로가기"]').is_visible()
    assert_no_overflow(page)
    row["screens"].append(shot(page, f"{theme}-390-intro-{style}-cover"))


with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    try:
        cases = [(theme, width, height, "full", "none")
                 for theme in THEMES for width, height in SIZES]
        cases += [(theme, 390, 844, scenario, "none")
                  for theme in THEMES for scenario in ("groom", "bride", "empty", "long")]
        cases += [(theme, 390, 844, "text200", "none") for theme in THEMES]
        cases += [(theme, 390, 844, "intro", style)
                  for theme in THEMES for style in ("light", "cinema", "envelope")]
        limit = int(os.environ.get("INVITATION_UI07F_LIMIT", "0"))
        if limit > 0:
            cases = cases[:limit]
        for theme, width, height, scenario, intro_style in cases:
            context = browser.new_context(
                viewport={"width": width, "height": height},
                device_scale_factor=1 if width >= 768 else 2,
                locale="ko-KR",
                reduced_motion="no-preference" if scenario == "intro" else "reduce",
                accept_downloads=True, permissions=["clipboard-read", "clipboard-write"],
            )
            context.add_init_script(script=f"({MAP_MOCK})({{ fail: false }})")
            context.add_init_script(script=f"({AUDIO_MOCK})()")
            page = context.new_page()
            page.on("pageerror", lambda error: None)
            record = {
                "theme": theme, "width": width, "scenario": scenario,
                "intro": intro_style, "passed": False, "screens": [],
                "guestbook_submissions": 0,
            }
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)[:350]))
            try:
                query = {
                    "qaTheme": theme, "qaUI07": "1", "qaUI07Case": "full" if scenario in ("text200", "intro") else scenario,
                    "qaUI07Map": "coordinates", "qaMusic": "1", "embed": "1",
                }
                if intro_style != "none":
                    query["qaUI07Intro"] = intro_style
                response = page.goto(
                    BASE + "/sample-invitation/?" + urlencode(query),
                    wait_until="domcontentloaded", timeout=90000
                )
                assert response is not None and response.status == 200, "fictional sample HTTP 200"
                if scenario == "intro":
                    intro_case(page, theme, intro_style, record)
                else:
                    full_case(page, theme, width, scenario, record)
                assert not errors, errors
                record["passed"] = True
                print("UI07F_BROWSER_OK", theme, width, scenario, intro_style, flush=True)
            except Exception as error:
                record["error"] = type(error).__name__ + ": " + str(error)[:1350]
                print("UI07F_BROWSER_FAIL", theme, width, scenario, intro_style, record["error"], flush=True)
                try:
                    record["screens"].append(shot(page, f"{theme}-{width}-{scenario}-{intro_style}-failure"))
                except Exception:
                    pass
            finally:
                report["cases"].append(record)
                context.close()
            if not record["passed"]:
                print("UI07F_BROWSER_ABORT_FIRST_FAILURE", flush=True)
                break
    finally:
        browser.close()

report["summary"] = {
    "passed": sum(item["passed"] for item in report["cases"]),
    "total": len(report["cases"]),
    "screenshots": sum(len(item["screens"]) for item in report["cases"]),
    "ics_downloads_verified": sum(bool(item.get("ics_verified")) for item in report["cases"]),
    "intro_to_cover_cases": sum(item["passed"] and item["scenario"] == "intro" for item in report["cases"]),
    "failed": [{
        "theme": item["theme"], "width": item["width"],
        "scenario": item["scenario"], "error": item.get("error")
    } for item in report["cases"] if not item["passed"]],
}
(OUT / "manifest.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print("UI07F_BROWSER_SUMMARY", json.dumps(report["summary"], ensure_ascii=False), flush=True)
if report["summary"]["passed"] != report["summary"]["total"]:
    raise SystemExit("UI-07-F integrated browser QA failed")
