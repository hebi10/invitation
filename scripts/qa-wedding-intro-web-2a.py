#!/usr/bin/env python3
"""Chromium verification of the actual Next.js WeddingIntro renderer after 2-A.

Only local preview routes with published sample assets are used.
No customer credentials, Firestore writes, Play purchases or public deployments.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps
from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_INTRO_QA_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
ROOT = Path("artifacts/quiet-invitation-2a")
ROOT.mkdir(parents=True, exist_ok=True)
STYLES = ("light", "cinema", "envelope")
SIZES = {
    "mobile390": {"width":390, "height":844, "scale":2, "is_mobile":True},
    "desktop1440": {"width":1440, "height":900, "scale":1, "is_mobile":False},
}
report = {
    "phase":"Invitation 2-A actual React/Next.js web intro",
    "source":"local Next.js /mobile-intro-preview, not deployed Firebase",
    "generated_at_utc":datetime.now(timezone.utc).isoformat(),
    "cases":[], "responsive":[], "reduced_motion":[], "errors":[],
    "screenshots":[],
    "limitations":[
        "Uses the existing sample intro preview component, connectToCover=false.",
        "Public customer-cover handoff and physical Android/iOS tests are separate 3-A items.",
        "No production Firebase deployment or Firestore modifications were performed.",
    ],
}

def page_url(style):
    return BASE + "/mobile-intro-preview/?style=" + style

def screenshot(page, name):
    path = ROOT / name
    page.screenshot(path=str(path), animations="allow", timeout=30000)
    data = path.read_bytes()
    report["screenshots"].append({
        "file":name,"bytes":len(data),
        "sha256":hashlib.sha256(data).hexdigest()
    })
    return path

def assert_closed(page, timeout=6000):
    page.locator("[data-wedding-intro]").wait_for(state="detached", timeout=timeout)
    assert page.evaluate("document.body.style.overflow") == "", "Scroll lock not restored"
    assert page.locator('[data-wedding-intro-pending]').count() == 0
    assert page.locator('[data-wedding-cover-photo][style*="hidden"]').count() == 0

def visit(browser, name, config, style):
    context = browser.new_context(
        viewport={"width":config["width"],"height":config["height"]},
        device_scale_factor=config["scale"],
        is_mobile=config["is_mobile"],has_touch=config["is_mobile"],
        locale="ko-KR",color_scheme="light",reduced_motion="no-preference",
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)[:250]))
    result={"viewport":name,"style":style,"url":page_url(style)}
    try:
        response=page.goto(page_url(style),wait_until="domcontentloaded",timeout=90000)
        assert response and response.ok, "HTTP " + str(response.status if response else "unknown")
        result["status"]=response.status
        dialog=page.locator('[data-wedding-intro="' + style + '"]')
        dialog.wait_for(state="visible",timeout=30000)
        assert dialog.get_attribute("data-intro-style") == style
        assert page.locator("[data-skip]").is_visible(), "Missing skip"
        assert page.locator("[data-skip]").bounding_box()["height"] >= 48
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        if style == "envelope":
            assert page.locator("[data-letter-card]").is_visible()
            assert page.locator("[data-letter-open]").is_visible()
            assert page.locator("[data-shutter], [data-seal], [data-flap], [data-card-flight]").count() == 0
            screenshot(page, name+"-"+style+"-before-tap.png")
            page.wait_for_timeout(2500)
            assert dialog.is_visible(), "Letter must wait for user input"
            page.locator("[data-letter-open]").click()
            assert_closed(page,timeout=7000)
            result["click_opens"]=True
        else:
            page.wait_for_timeout(470 if style=="light" else 550)
            assert dialog.is_visible(), "Auto intro ended before readable frame"
            screenshot(page,name+"-"+style+"-reading.png")
            assert_closed(page,timeout=7000)
            result["auto_closes"]=True

        page.reload(wait_until="domcontentloaded",timeout=90000)
        page.locator('[data-wedding-intro="' + style + '"]').wait_for(state="visible",timeout=30000)
        page.set_viewport_size({"width":config["width"]-24,"height":config["height"]})
        page.wait_for_timeout(125)
        assert page.locator('[data-wedding-intro="' + style + '"]').is_visible(), "Resize incorrectly dismissed intro"
        result["survives_resize"]=True
        page.locator("[data-skip]").click()
        assert_closed(page)
        result["skip"]=True

        assert not errors, errors
        result["js_errors"]=errors
        result["passed"]=True
    except Exception as exc:
        result["passed"]=False
        result["error"]=str(exc)[:1500]
        print("FAILED",name,style,result["error"])
    finally:
        report["cases"].append(result)
        context.close()

def checks(browser):
    for width in (320,360,430,600,840,1280):
        for style in STYLES:
            context=browser.new_context(
                viewport={"width":width,"height":900},
                device_scale_factor=1,reduced_motion="no-preference",
            )
            page=context.new_page()
            try:
                page.goto(page_url(style),wait_until="domcontentloaded",timeout=90000)
                page.locator('[data-wedding-intro="' + style + '"]').wait_for(state="visible",timeout=30000)
                metrics=page.evaluate("""() => {
                  const root=document.querySelector('[data-wedding-intro]');
                  const stage=root.querySelector('[data-style]').getBoundingClientRect();
                  const skip=root.querySelector('[data-skip]').getBoundingClientRect();
                  return {horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
                    stageWidth:stage.width,skipWidth:skip.width,skipHeight:skip.height,
                    stageHeight:stage.height,viewportWidth:innerWidth};
                }""")
                assert not metrics["horizontalOverflow"],metrics
                assert metrics["stageWidth"] <= min(width,480)+1, metrics
                assert metrics["skipWidth"] >=48 and metrics["skipHeight"]>=48,metrics
                page.locator('[data-skip]').click()
                assert_closed(page)
                report["responsive"].append({"width":width,"style":style,"passed":True})
            finally:
                context.close()

def reduced_motion(browser):
    for style in STYLES:
        context=browser.new_context(
            viewport={"width":390,"height":844},
            reduced_motion="reduce",
            locale="ko-KR",
        )
        page=context.new_page()
        try:
            page.goto(page_url(style),wait_until="domcontentloaded",timeout=90000)
            if style == "envelope":
                page.locator('[data-wedding-intro="envelope"]').wait_for(state="visible",timeout=30000)
                page.locator('[data-letter-open]').click()
                assert_closed(page,timeout=3000)
            else:
                assert_closed(page,timeout=5000)
            report["reduced_motion"].append({"style":style,"passed":True})
        finally:
            context.close()

def failed_photo(browser):
    context=browser.new_context(viewport={"width":390,"height":844},locale="ko-KR")
    context.route("**/images/home-wedding/portrait.webp",lambda route:route.abort())
    page=context.new_page()
    try:
        page.goto(page_url("cinema"),wait_until="domcontentloaded",timeout=90000)
        page.locator('[data-wedding-intro="cinema"]').wait_for(state="visible",timeout=30000)
        page.wait_for_timeout(650)
        assert page.locator(".photo[hidden], [data-intro-photo][hidden]").count()>=1, "Failed photo must be hidden"
        assert page.locator('[data-wedding-intro="cinema"]').inner_text().find("김도윤")>=0
        screenshot(page,"mobile390-cinema-photo-failure.png")
        assert_closed(page,timeout=5000)
        report["failed_photo_fallback"]=True
    finally:
        context.close()

def keyboard_escape(browser):
    context=browser.new_context(viewport={"width":390,"height":844},locale="ko-KR")
    page=context.new_page()
    try:
        page.goto(page_url("envelope"),wait_until="domcontentloaded",timeout=90000)
        page.locator('[data-letter-open]').wait_for(state="visible",timeout=30000)
        page.keyboard.press("Escape")
        assert_closed(page,timeout=4000)
        report["escape"]=True
    finally:
        context.close()

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    try:
        for name,config in SIZES.items():
            for style in STYLES:
                visit(browser,name,config,style)
        checks(browser)
        reduced_motion(browser)
        failed_photo(browser)
        keyboard_escape(browser)
    finally:
        browser.close()

summary={
    "success_cases":sum(1 for c in report["cases"] if c.get("passed")),
    "total_cases":len(report["cases"]),
    "responsive":len(report["responsive"]),
    "reduced_motion":len(report["reduced_motion"]),
    "failed_photo_fallback":report.get("failed_photo_fallback",False),
    "escape":report.get("escape",False),
    "screenshots":len(report["screenshots"]),
}
( ROOT / "manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
( ROOT / "SUMMARY.md").write_text(
    "# Invitation 2-A — 신규 공통 웹 인트로 브라우저 검증\n\n"+
    "Next.js dev 서버의 실제 React WeddingIntro 컴포넌트(공개 샘플 미리보기)를 Chromium에서 실행했습니다.\n\n"+
    "\n".join("- "+k+": "+str(v) for k,v in summary.items())+
    "\n\nFirebase 운영 고객 데이터 및 공개 배포는 변경되지 않았습니다.\n",
    encoding="utf-8"
)
print("2A_QA_SUMMARY",json.dumps(summary,ensure_ascii=False))
if summary["success_cases"] != 6 or summary["responsive"] !=18 or summary["reduced_motion"] !=3 or not summary["failed_photo_fallback"] or not summary["escape"]:
    raise SystemExit("2-A browser regression failed; review manifest.json")
