#!/usr/bin/env python3
"""Public visitor intro QA: 5 event types, viewports, consent-to-open and compatibility."""
import asyncio
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from playwright.async_api import async_playwright

BASE = os.environ.get("INTRO_02D_QA_BASE_URL", "http://127.0.0.1:3000")
ARTIFACT_DIR = Path("artifacts/intro-gif-02d-public")
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
EVENTS = ["wedding", "first-birthday", "birthday", "opening", "general-event"]
CHECKS = []


def target(*, event="wedding", intro="intro-01", slug="intro-public-qa"):
    return f"{BASE}/intro-public-qa/?{urlencode({'event': event, 'intro': intro, 'slug': slug})}"


async def capture(page, name):
    path = ARTIFACT_DIR / f"{name}.png"
    await page.screenshot(path=str(path), full_page=True)
    CHECKS.append({"check": name, "file": path.name,
                   "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        for width, height in [(320, 720), (390, 844), (768, 1024)]:
            for event in EVENTS:
                context = await browser.new_context(viewport={"width": width, "height": height},
                                                    device_scale_factor=1)
                page = await context.new_page()
                url = target(event=event, slug=f"qa-{event}-{width}")
                response = await page.goto(url, wait_until="domcontentloaded")
                assert response and response.status == 200, (event, width)
                dialog = page.locator("[data-public-invitation-gif-intro='intro-01']")
                await dialog.wait_for()
                assert await dialog.count() == 1, f"{event} / {width} must show only one GIF"
                assert await page.locator("[data-intro-qa-body]").get_attribute("data-event-type") == event
                await dialog.get_by_role("button", name="초대장 보기").focus()
                assert await dialog.get_by_role("button", name="초대장 보기").evaluate(
                    "(button) => document.activeElement === button")
                await capture(page, f"{event}-{width}")
                if event == "wedding" and width == 390:
                    await page.wait_for_timeout(2300)
                    assert await dialog.is_visible(), "2s GIF must not auto-enter body"
                    await dialog.get_by_role("button", name="다시 보기").click()
                    await dialog.locator("img[src*='replay=1']").wait_for()
                    await capture(page, "wedding-replay")
                await dialog.get_by_role("button", name="초대장 보기").click()
                assert await dialog.count() == 0
                await page.reload(wait_until="domcontentloaded")
                await page.wait_for_timeout(150)
                assert await dialog.count() == 0, "Already opened in this session"
                await context.close()

        reduced = await browser.new_context(viewport={"width": 390, "height": 844},
                                            reduced_motion="reduce")
        page = await reduced.new_page()
        gif_urls = []
        page.on("request", lambda req: gif_urls.append(req.url)
                if "/assets/invitation-intro/universal-2s.gif" in req.url else None)
        await page.goto(target(slug="qa-reduced"), wait_until="domcontentloaded")
        await page.get_by_text("모션 감소 설정에 따라 정지 이미지를 표시합니다.").wait_for()
        await page.locator("[data-public-invitation-gif-intro] img[src*='poster.webp']").wait_for()
        await page.wait_for_timeout(250)
        assert not gif_urls, "reduced motion should not fetch GIF"
        await capture(page, "reduced-motion-poster")
        await reduced.close()

        failure = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await failure.new_page()
        await page.route("**/assets/invitation-intro/universal-2s.gif*",
                         lambda route: route.fulfill(status=404, body="missing"))
        await page.goto(target(slug="qa-gif-error"), wait_until="domcontentloaded")
        await page.get_by_text("GIF를 불러오지 못해 정지 이미지를 표시합니다.").wait_for()
        await page.locator("[data-public-invitation-gif-intro] img[src*='poster.webp']").wait_for()
        await capture(page, "gif-error-poster")
        await failure.close()

        skipped = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await skipped.new_page()
        await page.goto(target(slug="qa-deep-link") + "#details", wait_until="domcontentloaded")
        await page.wait_for_timeout(200)
        assert await page.locator("[data-public-invitation-gif-intro]").count() == 0
        assert await page.locator("[data-intro-qa-body]").is_visible()
        for event in EVENTS:
            for choice in ("none", "intro-unverified"):
                await page.goto(target(event=event, intro=choice, slug=f"qa-disabled-{event}"),
                                wait_until="domcontentloaded")
                await page.wait_for_timeout(100)
                assert await page.locator("[data-public-invitation-gif-intro]").count() == 0, (
                    event, choice)
        CHECKS.append({"check": "deep-link-none-unregistered", "status": "pass"})
        await skipped.close()
        await browser.close()

    (ARTIFACT_DIR / "manifest.json").write_text(
        json.dumps({"checks": CHECKS}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("INTRO_GIF_02D_BROWSER_QA_OK", len(CHECKS))


if __name__ == "__main__":
    asyncio.run(main())
