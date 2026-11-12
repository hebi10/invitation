#!/usr/bin/env python3
"""Dev-only intro catalogue browser QA; never reads or writes real customer data."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_INTRO_QA_BASE", "http://127.0.0.1:3000")
OUT = Path("artifacts/intro-gif-02a")
OUT.mkdir(parents=True, exist_ok=True)
report = {"task": "INTRO-GIF-02-A", "cases": [], "files": [], "production_writes": 0}


def screenshot(page, name):
    path = OUT / name
    page.screenshot(path=str(path), full_page=True, animations="disabled")
    report["files"].append({
        "name": name,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "bytes": path.stat().st_size,
    })


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        for width in (320, 390, 768, 1440):
            context = browser.new_context(viewport={"width": width, "height": 900},
                                          locale="ko-KR", reduced_motion="no-preference")
            page = context.new_page()
            gif_requests = []
            page.on("request", lambda request: gif_requests.append(request.url)
                    if request.url.endswith("/universal-2s.gif") else None)
            response = page.goto(BASE + "/intro-catalog-preview/", wait_until="domcontentloaded", timeout=90000)
            assert response and response.status == 200
            picker = page.locator("[data-intro-catalog-fixture]")
            picker.wait_for(state="visible")
            page.get_by_role("heading", name="고객 선택형 인트로 카탈로그").wait_for(state="visible")
            radio = picker.locator('input[type="radio"]')
            assert radio.count() == 2, (width, "one real GIF and explicit none only")
            assert not radio.nth(0).is_checked() and not radio.nth(1).is_checked()
            assert picker.locator("[data-intro-preset]").count() == 1
            assert picker.locator("[data-intro-preset='intro-01'] img").count() == 1
            assert picker.locator("[data-intro-preset='intro-02']").count() == 0
            assert picker.locator(".gif").count() == 0
            assert not gif_requests, "GIF downloaded in list rather than on demand"
            assert picker.get_by_text("미저장 선택: 없음").count() == 1
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 2"), (
                width, "horizontal overflow")
            screenshot(page, f"intro-catalog-{width}.png")

            button = picker.get_by_role("button", name="GIF 미리보기")
            button.click()
            modal = page.locator("dialog[open]")
            modal.wait_for(state="visible")
            image = modal.locator("img")
            assert image.get_attribute("src") == "/assets/invitation-intro/universal-2s.gif"
            assert modal.get_by_text("저장 상태는 변경되지 않습니다.", exact=False).count() == 1
            assert picker.get_by_text("미저장 선택: 없음").count() == 1, "Preview changed selection"
            assert modal.get_by_role("button", name="다시 보기").is_enabled()
            screenshot(page, f"intro-modal-{width}.png")
            modal.get_by_role("button", name="다시 보기").click()
            assert modal.locator("img").get_attribute("src") == "/assets/invitation-intro/universal-2s.gif"
            page.keyboard.press("Escape")
            modal.wait_for(state="hidden")
            page.wait_for_function("""() =>
              document.activeElement?.textContent?.includes('GIF 미리보기') === true""")

            picker.locator('input[type="radio"][value="intro-01"]').check()
            assert picker.get_by_text("미저장 선택: intro-01").count() == 1
            assert picker.get_by_text("선택이 변경되었습니다.", exact=False).count() == 1
            picker.locator('input[type="radio"][value="none"]').check()
            assert picker.get_by_text("미저장 선택: none").count() == 1
            page.reload(wait_until="domcontentloaded")
            picker.get_by_text("미저장 선택: 없음").wait_for(state="visible")
            assert not picker.locator('input[value="intro-01"]').is_checked()
            assert not picker.locator('input[value="none"]').is_checked()
            report["cases"].append({"width": width, "passed": True,
                "checks": ["poster-first", "no-phantom-items", "preview-no-save",
                           "one-gif-on-demand", "replay", "escape-focus-restore",
                           "explicit-none", "no-persistence", "no-overflow"]})
            context.close()

        context = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        page = context.new_page()
        gif_requests = []
        page.on("request", lambda request: gif_requests.append(request.url)
                if request.url.endswith(".gif") else None)
        page.goto(BASE + "/intro-catalog-preview/", wait_until="domcontentloaded")
        page.get_by_role("button", name="GIF 미리보기").click()
        modal = page.locator("dialog[open]")
        modal.wait_for(state="visible")
        modal.get_by_text("동작 줄이기 설정에 따라 정지 이미지를 표시합니다.").wait_for()
        assert modal.locator("img").get_attribute("src") == "/assets/invitation-intro/poster.webp"
        assert not gif_requests, "Reduced-motion downloaded moving GIF"
        assert modal.get_by_role("button", name="다시 보기").is_disabled()
        screenshot(page, "intro-reduced-motion.png")
        report["cases"].append({"width": 390, "variant": "reduced-motion", "passed": True})
        context.close()

        context = browser.new_context(viewport={"width": 390, "height": 844},
                                      reduced_motion="no-preference")
        page = context.new_page()
        page.route("**/assets/invitation-intro/universal-2s.gif", lambda route: route.abort())
        page.goto(BASE + "/intro-catalog-preview/", wait_until="domcontentloaded")
        page.get_by_role("button", name="GIF 미리보기").click()
        modal = page.locator("dialog[open]")
        modal.wait_for(state="visible")
        modal.get_by_text("애니메이션을 불러오지 못해 정지 이미지를 표시합니다.").wait_for(timeout=12000)
        assert modal.locator("img").get_attribute("src") == "/assets/invitation-intro/poster.webp"
        assert page.get_by_text("미저장 선택: 없음").count() == 1
        screenshot(page, "intro-error-poster-fallback.png")
        report["cases"].append({"width": 390, "variant": "network-failure", "passed": True})
        context.close()
    finally:
        browser.close()

assert len(report["cases"]) == 6 and all(case["passed"] for case in report["cases"])
(OUT / "manifest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                                   encoding="utf-8")
print("INTRO_GIF_02A_BROWSER_SUMMARY",
      json.dumps({"cases": len(report["cases"]), "passed": 6, "screenshots": len(report["files"]),
                  "production_writes": 0}, ensure_ascii=False), flush=True)
