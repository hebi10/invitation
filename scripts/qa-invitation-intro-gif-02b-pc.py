#!/usr/bin/env python3
"""Isolated PC editor preview/save contract for five event types; NO live Firestore IO."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_INTRO_QA_BASE", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/intro-gif-02b-pc")
OUT.mkdir(parents=True, exist_ok=True)
events = ("wedding", "first-birthday", "birthday", "opening", "general-event")
widths = (320, 390, 1440)
report = {"task": "INTRO-GIF-02-B", "cases": [], "screenshots": [], "production_writes": 0}


def screenshot(page, name):
    path = OUT / name
    page.screenshot(path=str(path), full_page=True, animations="disabled")
    report["screenshots"].append({
        "name": name, "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest()
    })


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        for width in widths:
            context = browser.new_context(
                viewport={"width": width, "height": 860},
                locale="ko-KR", reduced_motion="no-preference"
            )
            page = context.new_page()
            failures = []
            page.on("pageerror", lambda err: failures.append(str(err)[:200]))
            page.goto(BASE + "/intro-catalog-editor-qa/", wait_until="domcontentloaded", timeout=90000)
            page.locator('[data-intro-editor-qa][data-ready="true"]').wait_for(state="attached", timeout=20000)
            for event in events:
                page.locator("[data-qa-event-type]").select_option(event)
                assert page.locator("[data-qa-summary]").inner_text().find("이벤트: " + event) >= 0
                picker = page.locator("[data-intro-preset-editor]")
                assert picker.locator('input[type="radio"]').count() == 2, (event, "Only verified preset 01 + none")
                assert not picker.locator('input[value="intro-01"]').is_checked()
                assert not picker.locator('input[value="none"]').is_checked()
                assert "저장값: 기존 설정" in page.locator("[data-qa-summary]").inner_text()
                assert not page.locator('[data-intro-preset="intro-02"]').count()
                if event == "wedding":
                    assert picker.locator("[data-intro-legacy-status]").count() == 1
                    assert "웨딩 화보형" in picker.locator("[data-intro-legacy-status]").inner_text()

                picker.get_by_role("button", name="GIF 미리보기").click()
                modal = page.locator("dialog[open]")
                modal.wait_for(state="visible")
                assert modal.locator("img").get_attribute("src") == "/assets/invitation-intro/universal-2s.gif"
                assert "저장값: 기존 설정" in page.locator("[data-qa-summary]").inner_text()
                page.keyboard.press("Escape")
                modal.wait_for(state="hidden")

                picker.locator('input[value="intro-01"]').check()
                assert "미저장 선택: intro-01" in page.locator("[data-qa-summary]").inner_text()
                assert "저장값: 기존 설정" in page.locator("[data-qa-summary]").inner_text()
                page.locator("[data-qa-reset]").click()
                assert "미저장 선택: 미선택" in page.locator("[data-qa-summary]").inner_text(), "Cancel must restore saved state"

                picker.locator('input[value="intro-01"]').check()
                page.locator("[data-qa-save]").click()
                assert "저장값: intro-01" in page.locator("[data-qa-summary]").inner_text()
                assert picker.get_by_text("현재 적용 중").count() == 1
                assert not picker.get_by_text("선택이 변경되었습니다.", exact=False).count()

                picker.locator('input[value="none"]').check()
                assert "미저장 선택: none" in page.locator("[data-qa-summary]").inner_text()
                assert "저장값: intro-01" in page.locator("[data-qa-summary]").inner_text()
                page.locator("[data-qa-reset]").click()
                assert "미저장 선택: intro-01" in page.locator("[data-qa-summary]").inner_text()
                picker.locator('input[value="none"]').check()
                page.locator("[data-qa-save]").click()
                assert "저장값: none" in page.locator("[data-qa-summary]").inner_text()
                assert picker.get_by_text("현재 적용 중").count() == 1
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 2"), (
                    width, event, "unexpected horizontal overflow")
                assert not failures, (width, event, failures)
                screenshot(page, f"pc-intro-{event}-{width}.png")
                report["cases"].append({"event": event, "viewport": width, "pass": True,
                    "checks": ["preview-does-not-save", "legacy-preserved", "cancel", "save-reload", "none", "responsive"]})
            context.close()
    finally:
        browser.close()

assert len(report["cases"]) == 15 and all(case["pass"] for case in report["cases"])
(OUT / "manifest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("INTRO_GIF_02B_PC_BROWSER_SUMMARY",
      json.dumps({"cases": 15, "passed": 15, "screenshots": len(report["screenshots"]),
                  "production_writes": 0}, ensure_ascii=False), flush=True)
