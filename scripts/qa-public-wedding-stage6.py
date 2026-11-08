#!/usr/bin/env python3
"""Stage 6 read-only smoke tests of the public wedding invitation (5 themes).

No guestbook submission, outbound Kakao share, payment, Firebase write,
or external-app navigation is performed. Kakao SDK sendDefault is intercepted
in this ephemeral Chromium context. A passing run does NOT certify real devices.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

OUTPUT = Path("artifacts/public-wedding-stage6")
OUTPUT.mkdir(parents=True, exist_ok=True)
THEMES = (
    ("simple", "01-basic"),
    ("classic-r", "02-modern"),
    ("romantic", "03-photo"),
    ("gyeol", "04-classic"),
    ("emotional", "05-natural"),
)
BASE = "https://invite.msgnote.kr/shin-minje-kim-hyunji"
REQUIRE_DEPLOYED_MAP_HTTPS = os.getenv('STAGE6_REQUIRE_MAP_HTTPS', '1') == '1'
ISSUES: list[str] = []
RECORDS: list[dict] = []


def ensure(condition: bool, theme: str, description: str):
    if not condition:
        raise AssertionError(f"{theme}: {description}")


def open_test_invitation(page, theme: str):
    url = f"{BASE}/{theme}/"
    resp = page.goto(url, wait_until="domcontentloaded", timeout=60000)
    ensure(resp is not None and resp.status == 200, theme, "public URL must return HTTP 200")
    page.get_by_text("김현지", exact=False).first.wait_for(timeout=24000)
    introduction = page.get_by_role("dialog", name="결혼식 초대장 인트로")
    try:
        introduction.first.wait_for(state="visible", timeout=7500)
    except PlaywrightTimeout:
        pass
    if introduction.count() and introduction.first.is_visible():
        page.get_by_role("button", name="건너뛰기").first.click(timeout=12000)
        introduction.first.wait_for(state="hidden", timeout=14000)
    page.locator('button[aria-label^="음악 "]').first.wait_for(
        state="visible", timeout=20000
    )
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(350)
    return url


def test_links_and_sections(page, theme: str, result: dict):
    root = page.locator("main[data-design]")
    ensure(root.count() == 1, theme, "exactly one public wedding layout required")
    ensure(root.get_attribute("data-design") == theme, theme, "wrong theme loaded")
    hrefs = page.locator('nav[aria-label="청첩장 바로가기"] a').evaluate_all(
        "(items) => items.map(item => item.getAttribute('href'))"
    )
    expected = ["#wedding-info", "#wedding-location", "#wedding-gallery"]
    ensure(hrefs == expected, theme, "quick links must keep ceremony/location/gallery order")
    landing: list[dict] = []
    for href in expected:
        anchor = page.locator(f'nav[aria-label="청첩장 바로가기"] a[href="{href}"]')
        anchor.first.click(timeout=9000)
        target = page.locator(href)
        ensure(target.count() == 1, theme, f"missing anchor target {href}")
        try:
            page.wait_for_function(
                """selector => {
                    const element = document.querySelector(selector);
                    const y = element?.getBoundingClientRect().top ?? -9999;
                    return y >= 50 && y <= 185;
                }""",
                arg=href, timeout=7000, polling=100,
            )
        except PlaywrightTimeout:
            pass
        y = target.first.evaluate("(element) => Math.round(element.getBoundingClientRect().top)")
        landing.append({"anchor": href, "landingTopPx": y})
        ensure(50 <= y <= 185, theme, f"{href} covered by top controls: {y}px")
    required = ["wedding-info", "wedding-location", "wedding-gallery"]
    for ident in required:
        ensure(page.locator(f"#{ident}").count() == 1, theme, f"missing section {ident}")
    ensure(page.locator('[data-wedding-section="guestbook"]').count() == 1, theme, "missing guestbook")
    ensure(page.locator("[data-wedding-closing]").count() == 1, theme, "missing closing")
    result["navigation"] = {"order": hrefs, "landings": landing, "ok": True}


def test_calendar(page, theme: str, result: dict):
    page.locator("#wedding-info").scroll_into_view_if_needed()
    button = page.get_by_role("button", name="캘린더에 저장")
    ensure(button.count() > 0, theme, "calendar export button missing")
    with page.expect_download(timeout=12000) as download_event:
        button.first.click(timeout=10000)
    download = download_event.value
    ensure(download.suggested_filename == "wedding.ics", theme, "unexpected calendar filename")
    data = Path(download.path()).read_text(encoding="utf-8")
    ensure("BEGIN:VCALENDAR" in data and "END:VCALENDAR" in data, theme, "invalid calendar body")
    ensure("BEGIN:VEVENT" in data and "DTSTART" in data, theme, "missing calendar event")
    ensure("신민제" in data and "김현지" in data, theme, "incorrect wedding names in calendar")
    result["calendar"] = {"file": "wedding.ics", "validICalendar": True}


def test_map_and_contacts(page, theme: str, result: dict):
    section = page.locator("#wedding-location")
    ensure(section.get_by_role("heading", name="오시는 길").count() > 0, theme, "directions heading missing")
    ensure(bool(section.inner_text().strip()), theme, "directions content empty")
    # The Kakao Maps SDK injects its own attribution anchors inside the map canvas.
    # Audit the application's outbound actions, not third-party tile/attribution DOM.
    links = section.locator('a[href^="http"]').evaluate_all("""items => items
        .filter(item => !item.closest('[class*="LocationMap_map__"]'))
        .map(item => ({
            href: item.href, target: item.target, rel: item.rel
        }))""")
    ensure(bool(links), theme, "map external link missing")
    for link in links:
        url = urlparse(link["href"])
        if url.scheme == "http" and url.hostname == "map.kakao.com" and not REQUIRE_DEPLOYED_MAP_HTTPS:
            # A PR checks the existing public site, not its not-yet-deployed fix.
            # This known legacy URL remains an explicit pending item until post-merge QA.
            result.setdefault("legacyMapUrlsPendingDeploy", 0)
            result["legacyMapUrlsPendingDeploy"] += 1
            print(f"STAGE6_PENDING_MAP_FIX {theme} map.kakao.com (PR only)", flush=True)
        else:
            ensure(url.scheme == "https", theme, "map must use HTTPS")
        if link["target"] == "_blank":
            ensure("noopener" in link["rel"] and "noreferrer" in link["rel"], theme, "map link needs safe rel")
    phone_links = section.locator('a[href^="tel:"]').count()
    contact = page.locator('details[data-wedding-section="contact"]')
    contact_actions = 0
    if contact.count() > 0:
        contact.first.locator("summary").click(timeout=10000)
        contact_actions = contact.first.locator('a[href^="tel:"],a[href^="sms:"]').count()
        ensure(contact_actions > 0, theme, "contact panel has no phone/SMS options")
    guide = page.locator('[data-wedding-section="transport"] details')
    if guide.count() > 0:
        guide.first.locator("summary").click(timeout=10000)
        ensure(guide.first.get_attribute("open") is not None, theme, "transport guide cannot expand")
    result["locationAndContact"] = {
        "mapExternalLinkCount": len(links), "venuePhoneLinkCount": phone_links,
        "familyContactActions": contact_actions, "transportDisclosure": guide.count() > 0,
        "externalAppsNotOpened": True,
    }


def test_gift_copy(page, theme: str, result: dict):
    gift = page.locator("#wedding-accounts")
    if not gift.count():
        result["account"] = {"configured": False, "copyTest": "not-applicable"}
        return
    for disclosure in gift.locator("details").all():
        if disclosure.get_attribute("open") is None:
            disclosure.locator("summary").click(timeout=10000)
    button = gift.locator('button[aria-label*="계좌번호 복사"]')
    if not button.count():
        result["account"] = {"configured": False, "copyTest": "not-applicable"}
        return
    button.first.click(timeout=10000)
    try:
        page.wait_for_function(
            """() => {
                const region = document.getElementById('wedding-accounts');
                const content = region?.innerText || '';
                return content.includes('복사 완료') || content.includes('복사하지 못했어요');
            }""",
            timeout=5000, polling=100,
        )
    except PlaywrightTimeout:
        pass
    message = gift.inner_text(timeout=10000)
    ensure("복사 완료" in message or "복사하지 못했어요" in message,
           theme, "clipboard action produced no status")
    failed = "복사하지 못했어요" in message
    ensure(not failed, theme, "account copy failed in Chromium secure context")
    # Never print or persist bank account numbers, clipboard contents, or recipient names.
    copied = page.evaluate("""async () => {
        try { const v = await navigator.clipboard.readText(); return v.trim().length > 5; }
        catch { return null; }
    }""")
    ensure(copied is not False, theme, "clipboard was empty after copy")
    result["account"] = {"configured": True, "copyFeedback": True, "clipboardChecked": copied}


def test_guestbook_readonly(page, theme: str, result: dict):
    guestbook = page.locator('[data-wedding-section="guestbook"]')
    show_form = guestbook.locator("summary").filter(has_text="축하 글 남기기")
    if show_form.count() > 0:
        show_form.first.click(timeout=9000)
    form = guestbook.locator("form")
    ensure(form.count() > 0, theme, "guestbook form missing")
    ensure(form.locator('input[required][maxlength="20"]').count() > 0,
           theme, "guestbook author validation missing")
    ensure(form.locator('textarea[required][maxlength="500"]').count() > 0,
           theme, "guestbook message validation missing")
    # Pure HTML validation: DO NOT call form.submit/requestSubmit, POST, or click submit.
    invalid = form.first.evaluate("(form) => !form.checkValidity()")
    ensure(invalid, theme, "empty guestbook form should be invalid")
    result["guestbook"] = {
        "formPresent": True, "requiredValidation": True,
        "postAttempted": False, "databaseNotChanged": True,
    }


def test_gallery(page, theme: str, result: dict):
    gallery = page.locator('[data-wedding-section="gallery"]')
    first = gallery.locator('button[aria-label*="번째 사진 크게 보기"]').first
    first.wait_for(state="visible", timeout=15000)
    first.click(timeout=15000)
    dialog = page.locator('[role="dialog"][aria-modal="true"]').filter(
        has=page.get_by_role("button", name="갤러리 크게 보기 닫기")
    ).first
    dialog.wait_for(state="visible", timeout=11000)
    page.screenshot(path=str(OUTPUT / f"{theme}-gallery.jpg"),
                    type="jpeg", quality=77, animations="disabled")
    show_list = dialog.get_by_role("button", name="전체 사진 목록으로 돌아가기")
    ensure(show_list.count() > 0, theme, "full gallery navigation missing")
    show_list.click(timeout=11000)
    full_list = dialog.locator('ul[aria-label="전체 사진 목록"]')
    full_list.wait_for(state="visible", timeout=10000)
    items = full_list.locator("li button")
    count = items.count()
    ensure(count >= 2, theme, "full gallery photo list empty")
    # Exercise first, middle and last image, not every high-resolution media file.
    sampled = sorted(set([0, count // 2, count - 1]))
    for index, position in enumerate(sampled):
        full_list.locator("li button").nth(position).click(timeout=14000)
        dialog.get_by_role("button", name="이전 이미지").wait_for(state="visible", timeout=12000)
        counter = dialog.locator('span[aria-live="polite"][aria-atomic="true"]').last
        display = counter.inner_text(timeout=10000)
        ensure(str(position + 1) in display, theme, f"gallery index did not reach sample {position}")
        if index != len(sampled) - 1:
            show_list.click(timeout=9000)
            full_list.wait_for(state="visible", timeout=9000)
    page.keyboard.press("Escape")
    dialog.wait_for(state="hidden", timeout=10000)
    result["gallery"] = {
        "photoCount": count, "samplesChecked": len(sampled),
        "fullListOpened": True, "dialogClosedByEscape": True,
        "allImagesIndividuallyOpened": False,
    }


def test_music(page, theme: str, result: dict):
    music = page.locator('button[aria-label^="음악 "]').first
    music.wait_for(state="visible", timeout=20000)
    label = music.get_attribute("aria-label") or ""
    ensure(label in ("음악 끄기", "음악 켜기"), theme, f"music control error state: {label}")
    music.click(timeout=10000)
    page.wait_for_timeout(500)
    changed = music.get_attribute("aria-label") or ""
    ensure(changed != label, theme, f"music toggle failed: {label} -> {changed}")
    audio = page.locator("audio")
    ensure(audio.count() > 0, theme, "music element missing")
    failure = audio.first.evaluate("(a) => a.error?.code ?? null")
    ensure(failure is None, theme, "audio element has a decode or network error")
    result["music"] = {"toggleChanged": True, "mediaError": False}


def test_kakao_payload_mock(page, theme: str, result: dict, expected_url: str):
    button = page.get_by_role("button", name="카카오톡 공유하기")
    ensure(button.count() > 0, theme, "Kakao sharing button missing")
    button.first.scroll_into_view_if_needed(timeout=10000)
    button.first.click(timeout=12000)
    page.wait_for_function("window.__invitationQaSharePayload != null", timeout=12000)
    payload = page.evaluate("""() => {
        const value = window.__invitationQaSharePayload;
        const link = value?.content?.link ?? value?.link;
        return {
            objectType: value?.objectType,
            url: link?.mobileWebUrl,
            imagePresent: Boolean(value?.content?.imageUrl),
            buttons: value?.buttons?.length ?? 0,
        };
    }""")
    url = urlparse(payload["url"] or "")
    ensure(url.scheme == "https" and url.hostname == "invite.msgnote.kr",
           theme, "share payload must use safe public HTTPS domain")
    ensure(url.path.rstrip("/") == urlparse(expected_url).path.rstrip("/"),
           theme, "Kakao share payload points to wrong theme")
    ensure(payload["objectType"] in ("feed", "text"), theme, "unsupported Kakao payload type")
    ensure(payload["buttons"] > 0, theme, "share payload has no invitation link button")
    result["kakaoMock"] = {
        "payloadType": payload["objectType"],
        "publicThemeUrl": True, "buttonPresent": True,
        "sendDefaultIntercepted": True, "actuallyShared": False,
    }


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
    try:
        for theme, prefix in THEMES:
            context = browser.new_context(
                viewport={"width": 390, "height": 844}, locale="ko-KR",
                device_scale_factor=1, reduced_motion="reduce",
                accept_downloads=True, permissions=["clipboard-read", "clipboard-write"],
            )
            # Prevent the real Kakao SDK's sendDefault from sending any invitations.
            context.add_init_script("""
                window.__invitationQaSharePayload = null;
                window.Kakao = {
                    isInitialized: () => true,
                    init: () => {},
                    Share: { sendDefault: (payload) => {
                        window.__invitationQaSharePayload = payload;
                    }},
                };
            """)
            page = context.new_page()
            result: dict = {"theme": theme, "features": {}, "httpStatus": None}
            requests = []
            page.on("request", lambda req: requests.append(req.url.split("?")[0])
                    if req.method not in ("GET", "HEAD", "OPTIONS") and
                    "/api/" in req.url else None)
            try:
                url = open_test_invitation(page, theme)
                result["httpStatus"] = 200
                actions = (
                    ("navigation", lambda: test_links_and_sections(page, theme, result["features"])),
                    ("calendar", lambda: test_calendar(page, theme, result["features"])),
                    ("mapContacts", lambda: test_map_and_contacts(page, theme, result["features"])),
                    ("gift", lambda: test_gift_copy(page, theme, result["features"])),
                    ("guestbook", lambda: test_guestbook_readonly(page, theme, result["features"])),
                    ("gallery", lambda: test_gallery(page, theme, result["features"])),
                    ("music", lambda: test_music(page, theme, result["features"])),
                    ("kakao", lambda: test_kakao_payload_mock(page, theme, result["features"], url)),
                )
                for label, action in actions:
                    try:
                        action()
                        print(f"STAGE6_OK {theme} {label}", flush=True)
                    except Exception as error:
                        message = str(error).splitlines()[0][:260]
                        ISSUES.append(f"{theme}/{label}: {type(error).__name__} {message}")
                        print(f"STAGE6_FAIL {theme} {label}: {message}", flush=True)
                result["unexpectedApiWrites"] = len(requests)
                if requests:
                    ISSUES.append(f"{theme}: detected {len(requests)} unexpected API non-GET requests")
                page.evaluate("window.scrollTo(0,0)")
                page.screenshot(
                    path=str(OUTPUT / f"{prefix}-live-full.jpg"),
                    type="jpeg", quality=78, full_page=True,
                    animations="disabled", timeout=60000,
                )
            except Exception as error:
                message = str(error).splitlines()[0][:260]
                ISSUES.append(f"{theme}/page: {type(error).__name__} {message}")
                print(f"STAGE6_FAIL {theme} page: {message}", flush=True)
            finally:
                RECORDS.append(result)
                context.close()
    finally:
        browser.close()

manifest = {
    "testedAt": datetime.now(timezone.utc).isoformat(),
    "source": "Public Firebase App Hosting URL, read-only test page",
    "execution": "GitHub Actions Chromium Playwright",
    "themes": RECORDS,
    "checksExpected": len(THEMES) * 8,
    "checksPassed": sum(len(record["features"]) for record in RECORDS),
    "issues": ISSUES,
    "automatedPublicSmokePassed": not ISSUES,
    "requiresDeployedMapHttps": REQUIRE_DEPLOYED_MAP_HTTPS,
    "releaseMapHttpsGateSatisfied": (
        REQUIRE_DEPLOYED_MAP_HTTPS and not any(
            record.get("features", {}).get("legacyMapUrlsPendingDeploy")
            for record in RECORDS
        ) and not ISSUES
    ),
    "excludedFromProof": [
        "Real Android/iOS hardware; TalkBack, VoiceOver, system orientation",
        "Actual KakaoTalk share/send/receive and external map-app handoff",
        "Actual customer account/Firebase write or payment/recovery flows",
        "All gallery images individually downloaded/opened",
        "Manually adjudicated color contrast on photography",
        "Sample invitation date/address/contact correctness",
    ],
}
(OUTPUT / "qa-manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
(OUTPUT / "SUMMARY.md").write_text(
    "# Invitation Stage 6 public smoke QA\n\n"
    f"Supported public themes: {len(RECORDS)}/5\n"
    f"Feature checks: {manifest['checksPassed']}/{manifest['checksExpected']}\n"
    f"Open issues: {len(ISSUES)}\n\n"
    + ("\n".join("- " + issue for issue in ISSUES) if ISSUES else "No automated public smoke blockers")
    + "\n\n**This does not certify release readiness without manual physical-device, "
      "real Kakao, production payment and authorization QA.**\n",
    encoding="utf-8",
)
print(
    f"STAGE6_COMPLETE themes={len(RECORDS)} "
    f"features={manifest['checksPassed']}/{manifest['checksExpected']} "
    f"issues={len(ISSUES)}",
    flush=True,
)
if ISSUES:
    raise SystemExit(1)
