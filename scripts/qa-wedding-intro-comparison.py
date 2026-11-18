#!/usr/bin/env python3
"""Exercise the wedding intro comparison against the local Next.js sample."""

from io import BytesIO
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from PIL import Image
from playwright.sync_api import expect, sync_playwright


ORIGIN = "http://127.0.0.1:3000"
SAMPLE = ORIGIN + "/sample-invitation/"
COMPARISON = ORIGIN + "/sample-invitation/intro-comparison/"
BOUQUET_GIF = "/images/wedding-intro/bouquet-ribbon.gif"
SEAL_ART = {
    "/images/wedding-intro/seal-closed.webp",
    "/images/wedding-intro/seal-open.webp",
}
VARIANTS = ("bouquet", "seal", "portrait")
SAMPLE_PHOTO = "/images/home-wedding/portrait.webp"
OUT = Path("test-results/wedding-intro-comparison")
TIMING_OBSERVER = """
    window.introTimings = {};
    const observe = () => {
        for (const element of document.querySelectorAll('[data-intro-sequence]')) {
            const { introSequence: variant, introPhase: phase } = element.dataset;
            const timing = window.introTimings[variant] ??= {};
            timing[phase] ??= performance.now();
            if (phase === 'playing') {
                timing.overlay ||= Boolean(element.querySelector('[data-intro-overlay]'));
                timing.sealArt ||= Boolean(element.querySelector('[data-seal-art]'));
                timing.portraitScene ||= Boolean(element.querySelector('[data-portrait-scene]'));
            }
        }
    };
    new MutationObserver(observe).observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['data-intro-phase'],
    });
"""


def source_path(url):
    source = urlsplit(url)
    if source.path.rstrip("/") == "/_next/image":
        return urlsplit(parse_qs(source.query)["url"][0]).path
    return source.path


def check_photo(image):
    expect(image).to_be_visible()
    expect(image).not_to_have_js_property("naturalWidth", 0)
    source = source_path(image.evaluate("element => element.currentSrc"))
    assert source == SAMPLE_PHOTO, f"Expected sample portrait, got {source}"


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
        assert 1600 <= sum(durations) <= 2500, "Expected about two seconds of GIF motion"


def open_preview(context, url, block_assets=()):
    page = context.new_page()
    page.add_init_script(TIMING_OBSERVER)
    responses = {}
    errors = []
    remote_requests = []

    def intercept(route):
        parsed = urlsplit(route.request.url)
        if parsed.scheme in ("http", "https") and parsed.netloc != "127.0.0.1:3000":
            remote_requests.append(route.request.url)
            route.abort()
        elif source_path(route.request.url) in block_assets:
            route.abort()
        else:
            route.continue_()

    page.route("**/*", intercept)
    page.on("response", lambda response: responses.update({source_path(response.url): response}))
    page.on("pageerror", lambda error: errors.append(str(error)))
    response = page.goto(url, wait_until="domcontentloaded", timeout=90_000)
    assert response and response.ok, f"Preview route unavailable: {url}"
    page.add_style_tag(content="nextjs-portal { display: none !important; }")
    return page, responses, errors, remote_requests


def screenshot(page, name):
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)


def check_auto_cover(page, sequence, variant):
    expect(sequence).to_have_attribute("data-intro-phase", "cover", timeout=9_000)
    expect(sequence.locator("[data-intro-overlay]")).to_have_count(0)
    timing = page.evaluate("variant => window.introTimings[variant]", variant)
    assert timing and timing.get("overlay"), f"{variant} did not show an opening overlay"
    assert "playing" in timing and "cover" in timing, f"{variant}: {timing}"
    elapsed = round(timing["cover"] - timing["playing"])
    assert 1900 <= elapsed <= 3300, f"{variant} took {elapsed}ms to reveal the cover"
    if variant == "seal":
        assert timing.get("sealArt"), "Opened scene did not include the generated envelope art"
    elif variant == "portrait":
        assert timing.get("portraitScene"), "Opening did not show the portrait development"
    print(f"{variant}: cover revealed automatically in {elapsed}ms")


def check_no_entry_buttons(page):
    for name in ("연출 보기", "초대장 열기", "사진 바로 보기"):
        expect(page.get_by_role("button", name=name, exact=True)).to_have_count(0)
    expect(page.locator("[data-tracing-scroll]")).to_have_count(0)


def check_comparison(page):
    expect(page.get_by_role("heading", name="청첩장 인트로 비교", exact=True)).to_be_visible()
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Horizontal overflow"
    check_no_entry_buttons(page)


def compare_previews(browser, width, reduced_motion=False):
    label = f"{width}px" + ("-reduced" if reduced_motion else "")
    recording = {}
    if width == 1280:
        recording = {"record_video_dir": str(OUT), "record_video_size": {"width": 1280, "height": 900}}
    with browser.new_context(
        viewport={"width": width, "height": 900 if width > 400 else 844},
        is_mobile=width < 500,
        has_touch=width < 500,
        reduced_motion="reduce" if reduced_motion else "no-preference",
        locale="ko-KR",
        **recording,
    ) as context:
        page, responses, errors, remote_requests = open_preview(context, COMPARISON)
        check_comparison(page)
        if not reduced_motion and width == 1280:
            expect(page.locator("[data-intro-overlay]")).to_have_count(3)
            screenshot(page, label + "-opening")

        for variant in VARIANTS:
            section = page.locator(f"[data-intro-preview='{variant}']")
            expect(section).to_be_visible()
            expect(section).to_contain_text("이서준 · 김하은")
            expect(section).to_contain_text("2027년 4월 17일")
            sequence = section.locator(f"[data-intro-sequence='{variant}']")
            if width < 500:
                sequence.scroll_into_view_if_needed()
            if not reduced_motion:
                check_auto_cover(page, sequence, variant)
            check_photo(sequence.locator("img[data-intro-cover]"))

        if reduced_motion:
            expect(page.locator("[data-intro-overlay]")).to_have_count(0)
            assert BOUQUET_GIF not in responses and not SEAL_ART.intersection(responses)
            assert not any("playing" in timing for timing in page.evaluate("window.introTimings").values())
        else:
            if width == 1280:
                check_gif(responses[BOUQUET_GIF])
            assert all(path in responses and responses[path].ok for path in SEAL_ART), "Generated envelope assets failed"

        screenshot(page, label + "-cover")
        assert not errors, errors
        assert not remote_requests, remote_requests
        print(f"Verified wedding intro comparison at {label}")

    if page.video:
        Path(page.video.path()).rename(OUT / "1280px-motion.webm")


def check_guest_previews(browser):
    with browser.new_context(viewport={"width": 390, "height": 844}, locale="ko-KR") as context:
        for variant in VARIANTS:
            # The cover must still appear when the generated GIF does not load.
            blocked = (BOUQUET_GIF,) if variant == "bouquet" else ()
            page, _, errors, remote_requests = open_preview(context, SAMPLE + f"?intro={variant}", blocked)
            check_no_entry_buttons(page)
            sequence = page.locator(f"[data-intro-sequence='{variant}']")
            check_auto_cover(page, sequence, variant)
            check_photo(page.locator("[data-wedding-cover-photo]"))
            assert not errors, errors
            assert not remote_requests, remote_requests
            page.close()

    for options in ({"reduced_motion": "reduce"}, {"java_script_enabled": False}):
        with browser.new_context(**options) as context:
            page, responses, errors, remote_requests = open_preview(context, SAMPLE + "?intro=bouquet")
            check_photo(page.locator("[data-wedding-cover-photo]"))
            expect(page.locator("[data-intro-overlay]")).to_have_count(0)
            assert BOUQUET_GIF not in responses
            assert not errors, errors
            assert not remote_requests, remote_requests


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        for width in (1280, 390, 320):
            compare_previews(browser, width)
        compare_previews(browser, 390, reduced_motion=True)
        check_guest_previews(browser)
        browser.close()


if __name__ == "__main__":
    main()
