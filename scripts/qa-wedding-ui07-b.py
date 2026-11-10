#!/usr/bin/env python3
"""UI-07-B: real React intro animation, timing and accessible handoff in Chromium."""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_UI07B_BASE", "http://127.0.0.1:3000").rstrip("/")
OUTPUT = Path("artifacts/ui-07-b-intro")
OUTPUT.mkdir(parents=True, exist_ok=True)
STYLES = ("light", "cinema", "envelope")
VIEWPORTS = ((320, 740, 2), (390, 844, 2), (1440, 900, 1))
REPORT = {
    "task": "UI-07-B",
    "created_utc": datetime.now(timezone.utc).isoformat(),
    "source": "local /mobile-intro-preview with fictional seed, not Firebase production",
    "real_customer_data": False,
    "physical_device": False,
    "cases": [],
}

def snapshot(page, stem):
    path = OUTPUT / (stem + ".png")
    page.screenshot(path=str(path), animations="allow", timeout=30000)
    return {"name": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}

with sync_playwright() as engine:
    browser = engine.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        for style in STYLES:
            for width, height, scale in VIEWPORTS:
                for reduced in ((False, True) if width == 390 else (False,)):
                    context = browser.new_context(
                        viewport={"width": width, "height": height},
                        device_scale_factor=scale,
                        locale="ko-KR",
                        reduced_motion="reduce" if reduced else "no-preference",
                        color_scheme="light",
                    )
                    page = context.new_page()
                    page_errors = []
                    page.on("pageerror", lambda error: page_errors.append(str(error)[:300]))
                    label = f"{style}-{width}" + ("-reduced" if reduced else "")
                    case = {"style": style, "width": width, "reduced": reduced, "passed": False, "screens": []}
                    try:
                        response = page.goto(
                            f"{BASE}/mobile-intro-preview/?style={style}",
                            wait_until="domcontentloaded", timeout=90000,
                        )
                        assert response is not None and response.status == 200, "preview must return 200"
                        intro = page.locator(f'[data-wedding-intro="{style}"]')
                        intro.wait_for(state="visible", timeout=20000)
                        assert intro.get_attribute("aria-modal") == "true"
                        assert intro.get_attribute("role") == "dialog"
                        skip = page.locator("[data-skip]")
                        assert skip.is_visible()
                        bounds = skip.bounding_box()
                        assert bounds and bounds["width"] >= 47.5 and bounds["height"] >= 47.5
                        stage = page.locator('[data-style="' + style + '"]').first
                        stage_box = stage.bounding_box()
                        assert stage_box and stage_box["width"] <= min(width, 480) + 2
                        assert not page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 2")

                        if reduced:
                            assert page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")
                            if style == "envelope":
                                intro.wait_for(state="visible", timeout=3000)
                                assert page.locator("[data-letter-open]").is_visible()
                                page.locator("[data-letter-open]").click()
                                intro.wait_for(state="detached", timeout=3500)
                            else:
                                intro.wait_for(state="detached", timeout=3500)
                        elif style == "envelope":
                            page.wait_for_timeout(950)
                            assert intro.is_visible(), "envelope should not auto-close"
                            assert page.locator("[data-letter-open]").is_enabled()
                            case["screens"].append(snapshot(page, label + "-ready"))
                            page.locator("[data-letter-open]").click()
                            assert intro.get_attribute("data-intro-opening") == "true"
                            page.wait_for_timeout(140)
                            assert intro.is_visible(), "letter should visibly react to tap"
                            case["screens"].append(snapshot(page, label + "-opening"))
                            intro.wait_for(state="detached", timeout=3200)
                        else:
                            lead = page.locator("[data-intro-lead]").first
                            name = page.locator("[data-intro-names]").first
                            date = page.locator("[data-intro-date]").first
                            for node in (lead, name, date):
                                animation = node.evaluate("(el) => getComputedStyle(el).animationName")
                                assert "introTextReveal" in animation, ("missing intro animation", animation)
                            if style == "cinema":
                                photo = page.locator("[data-intro-photo]")
                                assert photo.is_visible(), "cinema needs the sample hero image"
                                assert "introPhotoApproach" in photo.evaluate("(el) => getComputedStyle(el).animationName")
                            page.wait_for_timeout(1050)
                            assert intro.is_visible(), "reading frame dismissed too early"
                            assert float(name.evaluate("(el) => getComputedStyle(el).opacity")) > 0.95
                            assert float(date.evaluate("(el) => getComputedStyle(el).opacity")) > 0.4
                            case["screens"].append(snapshot(page, label + "-reading"))
                            intro.wait_for(state="detached", timeout=4800)
                        assert not page.locator('[data-wedding-intro-pending]').count()
                        assert not page.evaluate("document.body.style.overflow === 'hidden'")
                        assert not page_errors, page_errors
                        case["passed"] = True
                        print("UI07B_OK", label, flush=True)
                    except Exception as error:
                        case["error"] = type(error).__name__ + ": " + str(error)[:1800]
                        print("UI07B_FAIL", label, case["error"], flush=True)
                        try:
                            case["screens"].append(snapshot(page, label + "-failure"))
                        except Exception:
                            pass
                    finally:
                        REPORT["cases"].append(case)
                        context.close()
    finally:
        browser.close()

REPORT["summary"] = {
    "total": len(REPORT["cases"]),
    "passed": sum(row["passed"] for row in REPORT["cases"]),
    "failed": [{"style": row["style"], "width": row["width"], "error": row.get("error")} for row in REPORT["cases"] if not row["passed"]],
    "screenshots": sum(len(row["screens"]) for row in REPORT["cases"]),
}
(OUTPUT / "manifest.json").write_text(json.dumps(REPORT, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("UI07B_SUMMARY", json.dumps(REPORT["summary"], ensure_ascii=False), flush=True)
if REPORT["summary"]["passed"] != REPORT["summary"]["total"]:
    raise SystemExit("UI-07-B visual QA failed")
