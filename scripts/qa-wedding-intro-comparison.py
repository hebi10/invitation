#!/usr/bin/env python3
"""Exercise the wedding intro comparison against the local Next.js sample."""

from io import BytesIO
from pathlib import Path
from urllib.parse import urlsplit

from PIL import Image
from playwright.sync_api import expect, sync_playwright


ORIGIN = "http://127.0.0.1:3000"
COMPARISON = ORIGIN + "/sample-invitation/intro-comparison/"
ASSET_PREFIX = ORIGIN + "/images/wedding-intro/bouquet-ribbon"
POSTER = ASSET_PREFIX + ".webp"
GIF = ASSET_PREFIX + ".gif"
OUT = Path("test-results/wedding-intro-comparison")


def screenshot(page, name):
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)


def check_gif(response):
    assert response.ok, f"Bouquet GIF returned {response.status}"
    assert response.headers["content-type"].startswith("image/gif")
    with Image.open(BytesIO(response.body())) as image:
        assert image.n_frames > 1, "The bouquet image must contain moving frames"
        assert "loop" not in image.info, "The bouquet GIF must play only once"
        durations = []
        for index in range(image.n_frames):
            image.seek(index)
            durations.append(image.info["duration"])
        assert 1600 <= sum(durations) <= 2400, "Expected about two seconds of motion"


def open_comparison(context):
    page = context.new_page()
    gif_requests = []
    errors = []
    remote_requests = []

    def intercept(route):
        parsed = urlsplit(route.request.url)
        if parsed.scheme in ("http", "https") and parsed.netloc != "127.0.0.1:3000":
            remote_requests.append(route.request.url)
            route.abort()
        else:
            route.continue_()

    page.route("**/*", intercept)
    page.on("request", lambda req: gif_requests.append(req.url) if req.url.startswith(GIF) else None)
    page.on("pageerror", lambda error: errors.append(str(error)))
    response = page.goto(COMPARISON, wait_until="domcontentloaded", timeout=90_000)
    assert response and response.ok, f"Comparison route unavailable: HTTP {response.status if response else 'unknown'}"
    page.add_style_tag(content="nextjs-portal { display: none !important; }")
    expect(page.get_by_role("heading", name="청첩장 인트로 비교", exact=True)).to_be_visible()
    for variant in ("bouquet", "seal", "tracing"):
        section = page.locator(f"[data-intro-preview='{variant}']")
        expect(section).to_be_visible()
        expect(section).to_contain_text("이서준 · 김하은")
        expect(section).to_contain_text("2027년 4월 17일")
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Horizontal overflow"
    return page, gif_requests, errors, remote_requests


def check_preview(browser, width, reduced_motion=False):
    label = f"{width}px" + ("-reduced" if reduced_motion else "")
    with browser.new_context(
        viewport={"width": width, "height": 900 if width > 400 else 844},
        is_mobile=width < 500,
        has_touch=width < 500,
        reduced_motion="reduce" if reduced_motion else "no-preference",
        locale="ko-KR",
    ) as context:
        page, gif_requests, errors, remote_requests = open_comparison(context)
        bouquet = page.locator("[data-intro-preview='bouquet']")
        art = bouquet.locator("[data-bouquet-art]")
        expect(art).to_be_visible()
        page.wait_for_function("document.querySelector('[data-bouquet-art]')?.naturalWidth > 0")
        assert art.evaluate("element => element.currentSrc").startswith(POSTER), "Initial art is not the still poster"
        assert not gif_requests, "The GIF downloaded before the visitor requested it"
        screenshot(page, label + "-initial")

        if reduced_motion:
            play_button = bouquet.get_by_role("button", name="연출 보기", exact=True)
            if play_button.is_visible() and play_button.is_enabled():
                play_button.click()
            assert not gif_requests, "Reduced motion loaded the animated bouquet"
        else:
            with page.expect_response(lambda response: response.url.startswith(GIF)) as response:
                bouquet.get_by_role("button", name="연출 보기", exact=True).click()
            if width == 1280:
                check_gif(response.value)
            expect(art).to_have_js_property("currentSrc", POSTER, timeout=5_000)

        seal = page.locator("[data-intro-preview='seal']")
        expect(seal.locator("[data-seal-state='closed']")).to_be_visible()
        open_button = seal.get_by_role("button", name="초대장 열기", exact=True)
        open_button.focus()
        open_button.press("Enter")
        expect(seal.locator("[data-seal-state='opened']")).to_be_visible(timeout=5_000)
        expect(seal.locator("[data-seal-cover]")).to_be_visible()
        if width == 1280:
            screenshot(page, "1280px-seal-opened")
        seal.get_by_role("button", name="다시 보기", exact=True).click()
        expect(seal.locator("[data-seal-state='closed']")).to_be_visible()

        tracing = page.locator("[data-intro-preview='tracing']")
        expect(tracing.locator("[data-tracing-photo]")).to_be_visible()
        paper = tracing.locator("[data-tracing-paper]")
        if reduced_motion:
            if paper.count() > 0 and paper.is_visible():
                expect(paper).to_have_css("opacity", "0")
        else:
            scroll = tracing.locator("[data-tracing-scroll]")
            scroll.focus()
            expect(scroll).to_be_focused()
            before = paper.evaluate("element => [getComputedStyle(element).opacity, getComputedStyle(element).transform]")
            scroll.press("End")
            page.wait_for_function("document.querySelector('[data-tracing-scroll]')?.scrollTop > 0")
            page.wait_for_function(
                """before => {
                    const style = getComputedStyle(document.querySelector('[data-tracing-paper]'));
                    return style.opacity !== before[0] || style.transform !== before[1];
                }""",
                arg=before,
            )
            if width == 1280:
                screenshot(page, "1280px-tracing-revealed")

        assert not errors, errors
        assert not remote_requests, remote_requests
        print(f"Verified wedding intro comparison at {label}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        for width in (1280, 390, 320):
            check_preview(browser, width)
        check_preview(browser, 390, reduced_motion=True)
        browser.close()


if __name__ == "__main__":
    main()
