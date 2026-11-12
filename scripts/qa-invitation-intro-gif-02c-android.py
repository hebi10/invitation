#!/usr/bin/env python3
"""Isolated sample-only GIF preview regression for Android WebBrowser route."""
import asyncio
import hashlib
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = os.environ.get("INTRO_02C_QA_BASE_URL", "http://127.0.0.1:3000")
ARTIFACTS = Path("artifacts/intro-gif-02c-android")
ARTIFACTS.mkdir(parents=True, exist_ok=True)
checks = []


async def capture(page, filename):
    path = ARTIFACTS / filename
    await page.screenshot(path=str(path), full_page=True)
    checks.append({"case": filename.removesuffix(".png"), "image": filename,
                   "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        target = f"{BASE_URL}/mobile-gif-intro-preview/?preset=intro-01"

        for width, height in [(320, 720), (390, 844), (768, 1024)]:
            page = await browser.new_page(viewport={"width": width, "height": height},
                                          device_scale_factor=1)
            response = await page.goto(target, wait_until="domcontentloaded")
            assert response and response.status == 200, f"preview HTTP error at {width}"
            await page.locator("[data-intro-gif-preview]").wait_for()
            await page.locator("img[src*='universal-2s.gif'][src*='replay=0']").wait_for()
            assert await page.get_by_role("heading", name="인트로 GIF 미리보기").count() == 1
            assert await page.get_by_role("button", name="2초 GIF 다시 보기").is_enabled()
            await capture(page, f"preview-{width}.png")
            await page.get_by_role("button", name="2초 GIF 다시 보기").click()
            await page.locator("img[src*='replay=1']").wait_for()
            assert page.url == target, "Preview must not navigate to actual customer invitation"
            if width == 390:
                await capture(page, "replay-390.png")
            await page.wait_for_timeout(2200)
            assert page.url == target, "No forced auto-entry after 2s asset playback"
            await page.close()

        reduced = await browser.new_page(viewport={"width": 390, "height": 844},
                                         reduced_motion="reduce")
        gif_requests = []
        reduced.on("request", lambda request: gif_requests.append(request.url)
                   if "universal-2s.gif" in request.url else None)
        response = await reduced.goto(target, wait_until="domcontentloaded")
        assert response and response.status == 200
        await reduced.get_by_text("모션 감소 설정에 따라 정지 포스터만 표시합니다.").wait_for()
        await reduced.locator("img[src*='poster.webp']").wait_for()
        await reduced.wait_for_timeout(500)
        assert not gif_requests, "Reduced motion must not load GIF"
        await capture(reduced, "reduced-motion-poster.png")
        await reduced.close()

        broken = await browser.new_page(viewport={"width": 390, "height": 844})
        await broken.route("**/assets/invitation-intro/universal-2s.gif*",
                           lambda route: route.fulfill(status=404, body="missing"))
        await broken.goto(target, wait_until="domcontentloaded")
        await broken.get_by_text("GIF를 불러오지 못해 정지 포스터로 대체했습니다.").wait_for()
        await broken.locator("img[src*='poster.webp']").wait_for()
        await capture(broken, "gif-error-fallback.png")
        await broken.close()

        invalid = await browser.new_page()
        response = await invalid.goto(f"{BASE_URL}/mobile-gif-intro-preview/?preset=intro-999",
                                      wait_until="domcontentloaded")
        assert response and response.status == 404, "Unknown GIF must not display a fake preview"
        checks.append({"case": "unknown-preset-rejected", "httpStatus": response.status})
        await invalid.close()
        await browser.close()

    (ARTIFACTS / "manifest.json").write_text(
        json.dumps({"checked": checks}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"INTRO_GIF_02C_BROWSER_QA_OK {len(checks)} checks")


if __name__ == "__main__":
    asyncio.run(main())
