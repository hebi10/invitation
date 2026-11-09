#!/usr/bin/env python3
"""2-B: exercise the *real* PC wizard iframe/React intro using safe local draft messages.

No live owner account, Firebase write, Play purchase or released site is touched.
The parent in this test is a same-origin test harness; authenticated editor itself
is not being claimed as an end-to-end tested login/save flow.
"""
import hashlib
import json
import os
from pathlib import Path
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_2B_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/quiet-invitation-2b")
OUT.mkdir(parents=True, exist_ok=True)
seed = json.loads((OUT / "local-preview-seed.json").read_text("utf8"))
styles = ("light", "cinema", "envelope")
viewports = {
    "pc1440": {"width": 1440, "height": 900, "device_scale_factor": 1, "is_mobile": False},
    "mobile390": {"width": 390, "height": 844, "device_scale_factor": 2, "is_mobile": True},
}
report = {
    "title": "2-B PC draft iframe preview / Android shared web contract QA",
    "source": "local Next.js, same-origin test parent + real /wizard-preview/ child",
    "recorded_utc": datetime.now(timezone.utc).isoformat(),
    "production_edited": False,
    "test_seed_intro_style": seed.get("introStyle"),
    "cases": [],
    "limits": [
        "The authenticated PC editor itself is not signed in; a safe same-origin parent sends its unsaved draft.",
        "Android native WebBrowser selection is covered separately by an emulator fixture and shared URL contract tests.",
        "No real Firebase persistence or physical user device is used.",
    ],
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        for viewport, config in viewports.items():
            for style in styles:
                context = browser.new_context(
                    viewport={"width": config["width"], "height": config["height"]},
                    device_scale_factor=config["device_scale_factor"],
                    is_mobile=config["is_mobile"], has_touch=config["is_mobile"],
                    locale="ko-KR", reduced_motion="no-preference",
                )
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)[:300]))
                case = {"viewport": viewport, "style": style}
                try:
                    response = page.goto(BASE + "/mobile-intro-preview/?style=none", wait_until="domcontentloaded", timeout=90000)
                    assert response and response.ok, "Parent preview route unavailable"
                    page.evaluate("""args => {
                      const source = structuredClone(args.seed);
                      source.introStyle = 'none';
                      const pendingDraft = {...source, introStyle: args.style};
                      const iframe = document.createElement('iframe');
                      iframe.id = 'qa-intro-2b-iframe';
                      Object.assign(iframe.style, {
                        position: 'fixed', width: 'min(390px, 100vw)', height: 'min(800px, 100vh)',
                        top: '0', left: 'max(0px, calc((100vw - 390px) / 2))', zIndex: '5000',
                        border: '0', background: '#faf9f6',
                      });
                      window.__introQa2B = {source, pendingDraft, ready: 0, rendered: 0, top: 0};
                      window.addEventListener('message', event => {
                        if (event.origin !== location.origin || event.source !== iframe.contentWindow) return;
                        if (event.data?.type === 'wedding-wizard-preview:ready') {
                          window.__introQa2B.ready++;
                          iframe.contentWindow.postMessage({
                            type:'wedding-wizard-preview:update',
                            formState: pendingDraft,
                            theme:'simple',
                          }, location.origin);
                        }
                        if (event.data?.type === 'wedding-wizard-preview:rendered') {
                          window.__introQa2B.rendered++;
                          iframe.contentWindow.postMessage({
                            type:'wedding-wizard-preview:top'
                          }, location.origin);
                          window.__introQa2B.top++;
                        }
                      });
                      iframe.src = '/wizard-preview/';
                      document.body.append(iframe);
                    }""", {"seed": seed, "style": style})
                    page.wait_for_function("window.__introQa2B?.rendered > 0", timeout=40000)
                    frame = page.frame_locator("#qa-intro-2b-iframe")
                    intro = frame.locator('[data-wedding-intro="' + style + '"]')
                    intro.wait_for(state="visible", timeout=25000)
                    assert intro.get_attribute("data-intro-style") == style
                    body = intro.inner_text()
                    assert "테스트신랑" in body and "테스트신부" in body, (style, body[:300])
                    assert "2027년 4월 17일" in body
                    assert frame.locator("[data-skip]").is_visible()
                    if style == "envelope":
                        assert frame.locator("[data-letter-open]").is_visible()
                    if style == "cinema":
                        assert frame.locator("[data-intro-photo]").count() == 1
                    case["preview_draft_unchanged"] = page.evaluate(
                        "window.__introQa2B.source.introStyle === 'none'"
                    )
                    assert case["preview_draft_unchanged"], "Preview must never save the selected style"
                    case["same_origin"] = page.evaluate(
                        "document.getElementById('qa-intro-2b-iframe').contentWindow.location.origin === location.origin"
                    )
                    assert case["same_origin"]

                    filename = viewport + "-" + style + "-pc-wizard-intro.png"
                    image = OUT / filename
                    intro.screenshot(path=str(image), animations="allow", timeout=30000)
                    image_bytes = image.read_bytes()
                    case["screenshot"] = filename
                    case["sha256"] = hashlib.sha256(image_bytes).hexdigest()
                    case["bytes"] = len(image_bytes)
                    case["messages"] = page.evaluate(
                        "({ready: window.__introQa2B.ready, rendered: window.__introQa2B.rendered, top: window.__introQa2B.top})"
                    )
                    if style == "envelope":
                        frame.locator("[data-letter-open]").click(timeout=7000)
                    else:
                        frame.locator("[data-skip]").click(timeout=7000)
                    intro.wait_for(state="detached", timeout=7000)
                    assert page.evaluate("window.__introQa2B.source.introStyle") == "none"
                    assert not errors, errors
                    case["pass"] = True
                    print("2B PC iframe passed", viewport, style)
                except Exception as exc:
                    case["pass"] = False
                    case["error"] = str(exc)[:1200]
                    print("2B PC iframe failed", viewport, style, case["error"])
                finally:
                    report["cases"].append(case)
                    context.close()
    finally:
        browser.close()

report["summary"] = {
    "passed": sum(1 for case in report["cases"] if case.get("pass")),
    "total": len(report["cases"]),
    "screenshots": sum(1 for case in report["cases"] if case.get("screenshot")),
}
(OUT / "pc-wizard-preview-manifest.json").write_text(
    json.dumps(report, indent=2, ensure_ascii=False) + "\n", "utf8"
)
print("2B_PC_WIZARD_PREVIEW", json.dumps(report["summary"]))
assert report["summary"]["passed"] == 6, "PC iframe unsaved draft preview regression"
