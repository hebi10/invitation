#!/usr/bin/env python3
"""UI-07-A-00: read-only five-theme public invitation section baseline.

Capture before any UI-07-A design changes. Never submit forms, use phone links,
write to Firestore or record contact/bank/guestbook contents in JSON.
The live sample and local fictional fixture are separate evidence sources.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

SOURCE = os.environ.get("UI07A00_SOURCE", "live")
assert SOURCE in ("live", "local"), "Only live public or isolated local sample allowed"
LIVE_BASE = "https://invite.msgnote.kr/shin-minje-kim-hyunji"
LOCAL_BASE = os.environ.get("UI07A00_LOCAL_BASE", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/ui-07-a00-" + SOURCE)
OUT.mkdir(parents=True, exist_ok=True)
THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")
VIEWPORTS = {
    "mobile320": (320, 740, 2),
    "mobile390": (390, 844, 2),
    "mobile430": (430, 932, 2),
    "tablet768": (768, 1024, 1),
    "desktop1440": (1440, 900, 1),
}
DETAILS = {
    "contact": '[data-wedding-section="contact"]',
    "calendar": '[data-wedding-section="ceremony"] details',
    "transport": '[data-wedding-section="transport"] details',
    "gift": '[data-wedding-section="gift"] details',
    "guestbook": '[data-wedding-section="guestbook"] details',
}
MAIN_SHA = os.environ.get("GITHUB_SHA", "unavailable")
REDACT = """
/* Only the QA screenshot gets masked. No public code or data is changed. */
[data-wedding-section="contact"] [class*="contactList"] {
  filter: blur(18px) !important;
}
[data-wedding-section="gift"] [class*="accountNumber"],
[data-wedding-section="gift"] [class*="accountHolder"],
[data-wedding-section="gift"] [class*="accountBank"] {
  filter: blur(18px) !important;
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
}
[data-wedding-section="guestbook"] [class*="commentsGrid"] {
  filter: blur(22px) !important;
}
[data-wedding-section="guestbook"] [class*="commentAuthor"],
[data-wedding-section="guestbook"] [class*="commentMessage"],
[data-wedding-section="guestbook"] [class*="commentDate"],
[data-wedding-section="guestbook"] [class*="authorName"] {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  background: #e5e5e5 !important;
}
nextjs-portal { display: none !important; }
"""
results = {
    "task": "UI-07-A-00",
    "source": SOURCE,
    "recorded_utc": datetime.now(timezone.utc).isoformat(),
    "qa_checkout_sha": MAIN_SHA,
    "does_not_prove_firebase_app_hosting_rollout_sha": True,
    "read_only": True,
    "submissions": 0,
    "production_data_writes": 0,
    "external_map_or_phone_actions": 0,
    "redactions": "contact identities, account holder/number and guestbook comment content hidden in screenshots",
    "cases": [],
    "warnings": [],
}
js_metrics = r"""() => {
  const main = document.querySelector('main[data-design]');
  const root = main?.getBoundingClientRect();
  const y = element => {
    const r = element.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y + scrollY), width: Math.round(r.width),
             height: Math.round(r.height), bottom: Math.round(r.bottom + scrollY) };
  };
  const vars = s => Object.fromEntries(['--paper', '--paper-soft', '--ink', '--muted', '--line',
                  '--section-space', '--control-line'].map(name => [name, s.getPropertyValue(name).trim()]));
  let priorBottom = null;
  const sections = [...(main?.querySelectorAll('[data-wedding-section]') ?? [])].map(el => {
    const s = getComputedStyle(el);
    const rect = y(el);
    const heading = el.querySelector('h2') || el.querySelector(':scope > summary');
    const headingStyles = heading ? getComputedStyle(heading) : null;
    const headingRect = heading ? y(heading) : null;
    const summaries = [...el.querySelectorAll('summary')].slice(0,8).map(e =>
      (e.textContent || '').replace(/\s+/g,' ').trim().slice(0,64));
    const item = {
      key: el.getAttribute('data-wedding-section'),
      tag: el.tagName.toLowerCase(),
      class_role: el.className && typeof el.className === 'string'
        ? el.className.split(/\s+/).map(v => v.replace(/__[^\s]+$/, '')).slice(0,3)
        : [],
      bbox: rect,
      gap_from_previous: priorBottom === null ? null : Math.round(rect.y - priorBottom),
      heading: heading ? (heading.textContent || '').trim().slice(0,64) : null,
      heading_tag: heading?.tagName.toLowerCase() || null,
      heading_bbox: headingRect,
      heading_font_size: headingStyles?.fontSize || null,
      heading_line_height: headingStyles?.lineHeight || null,
      summary_labels: summaries,
      details_count: el.matches('details') ? 1 + el.querySelectorAll('details').length : el.querySelectorAll('details').length,
      background_color: s.backgroundColor,
      border_color: s.borderColor,
      border_widths: [s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],
      padding_top: s.paddingTop, padding_bottom: s.paddingBottom,
      margin_top: s.marginTop, margin_bottom: s.marginBottom,
      display: s.display
    };
    priorBottom = rect.bottom;
    return item;
  });
  return {
    theme: main?.dataset.design,
    viewport: innerWidth,
    document_height: document.documentElement.scrollHeight,
    horizontal_overflow: document.documentElement.scrollWidth > innerWidth + 1,
    main: main ? y(main) : null,
    css_vars: main ? vars(getComputedStyle(main)) : {},
    visual_sections: sections,
    section_order: sections.map(s=>s.key),
    closing_present: !!document.querySelector('[data-wedding-closing]'),
    contact_present: !!main?.querySelector('[data-wedding-section="contact"]'),
    calendar_present: !!main?.querySelector('[data-wedding-section="ceremony"] details'),
    guide_present: !!main?.querySelector('[data-wedding-section="transport"] details'),
    gift_present: !!main?.querySelector('[data-wedding-section="gift"]'),
    guestbook_present: !!main?.querySelector('[data-wedding-section="guestbook"]')
  };
}"""

def url_for(theme: str) -> str:
    if SOURCE == "live":
        return LIVE_BASE + "/" + theme + "/"
    return LOCAL_BASE + "/sample-invitation/?qaTheme=" + quote(theme) + "&embed=1"

def save_screenshot(page, filename: str, *, full=False, locator=None):
    target = OUT / filename
    if locator is None:
        page.screenshot(path=str(target), full_page=full, animations="disabled", timeout=60000)
    else:
        locator.screenshot(path=str(target), animations="disabled", timeout=60000)
    raw = target.read_bytes()
    return {"filename": filename, "sha256": hashlib.sha256(raw).hexdigest(), "size_bytes": len(raw)}

def skip_intro_if_present(page) -> str:
    if SOURCE == "local":
        return "not_applicable"
    # A public wedding intro may mount after the SSR cover has appeared.
    page.wait_for_timeout(1100)
    intro = page.get_by_role("dialog", name="결혼식 초대장 인트로")
    if not intro.count():
        intro = page.locator('[data-wedding-intro]').first
    if intro.count() and intro.first.is_visible():
        options = [
            page.get_by_role("button", name="건너뛰기").first,
            page.locator("[data-skip]").first,
        ]
        for button in options:
            if button.count() and button.is_visible():
                button.click(timeout=12000)
                try:
                    intro.first.wait_for(state="hidden", timeout=18000)
                except PlaywrightTimeout:
                    pass
                return "clicked_skip"
        return "visible_no_skip"
    return "not_visible"

def static_css_inventory():
    file = Path("src/app/_components/public-invitations/wedding/WeddingBase.module.css")
    lines = file.read_text("utf-8").splitlines()
    relevant = []
    for line_number, line in enumerate(lines, 1):
        if (re.search(r"section-space|\.page\[data-design=|\.heading|\.title|\.disclosureSummary"
                      r"|\.contactSection|\.ceremonySection|\.scheduleSection|\.transportSection"
                      r"|\.calendarDisclosure|\.accountSummary|\.formSummary|\.container", line)
                and (line.strip().startswith((".", "--", ":global", "/*", "@media")))):
            relevant.append({"line": line_number, "rule": line.strip()[:260]})
    return {"path": str(file), "lines": len(lines), "relevant_rules": relevant}

results["css_inventory"] = static_css_inventory()

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        for theme in THEMES:
            for label, (width, height, device_scale) in VIEWPORTS.items():
                ctx = browser.new_context(
                    viewport={"width": width, "height": height}, device_scale_factor=device_scale,
                    locale="ko-KR", reduced_motion="reduce", color_scheme="light",
                )
                page = ctx.new_page()
                page_errors = []
                page.on("pageerror", lambda error: page_errors.append(str(error)[:350]))
                row = {"theme": theme, "viewport_label": label, "size_css": [width,height],
                       "url": url_for(theme), "success": False, "screen_files": [],
                       "intro": "unchecked", "details": {}}
                try:
                    response = page.goto(url_for(theme), wait_until="domcontentloaded", timeout=75000)
                    row["http_status"] = response.status if response else None
                    assert response and response.status == 200, "public document HTTP 200 required"
                    main = page.locator('main[data-design="' + theme + '"]')
                    main.wait_for(state="visible", timeout=35000)
                    row["intro"] = skip_intro_if_present(page)
                    assert row["intro"] != "visible_no_skip", "intro covers document without a skip control"
                    page.evaluate("document.fonts.ready")
                    page.add_style_tag(content=REDACT)
                    row["metrics"] = page.evaluate(js_metrics)
                    assert row["metrics"]["theme"] == theme, "theme did not match"
                    assert not row["metrics"]["horizontal_overflow"], "horizontal overflow"
                    assert len(row["metrics"]["section_order"]) >= 5, "too few public content sections"
                    page.evaluate("scrollTo(0, 0)")
                    row["screen_files"].append(save_screenshot(page, theme+"-"+label+"-top.png"))
                    if label in ("mobile390", "desktop1440"):
                        row["screen_files"].append(save_screenshot(
                            page,theme+"-"+label+"-full.png",full=True))
                    if label == "mobile390":
                        for key in ("contact","ceremony","schedule","transport","gift","guestbook"):
                            locator=page.locator('[data-wedding-section="'+key+'"]')
                            if locator.count() and locator.first.is_visible():
                                row["screen_files"].append(save_screenshot(
                                    page,theme+"-section-"+key+"-closed.png",locator=locator.first))
                        for key, selector in DETAILS.items():
                            loc=page.locator(selector).first
                            if not loc.count() or not loc.is_visible():
                                row["details"][key]={"present":False}
                                continue
                            # Open and close only native details; no submit/network action.
                            state={"present":True,"closed_initially":not loc.evaluate("(el)=>el.open")}
                            try:
                                initial=loc.evaluate("(el)=>el.open")
                                if not initial:
                                    loc.locator("summary").first.click(timeout=18000)
                                state["open_after_toggle"]=bool(loc.evaluate("(el)=>el.open"))
                                state["open_height"]=int(loc.bounding_box()["height"])
                                row["screen_files"].append(save_screenshot(
                                    page,theme+"-details-"+key+"-open.png",locator=loc))
                                if not initial:
                                    loc.locator("summary").first.click(timeout=18000)
                                state["closed_after_restore"]=not bool(loc.evaluate("(el)=>el.open"))
                            except Exception as issue:
                                state["warning"]=type(issue).__name__ + ": " + str(issue)[:170]
                            row["details"][key]=state
                    row["page_errors"]=page_errors[:5]
                    row["success"]=True
                    print("A00_BASELINE_OK",SOURCE,theme,label,
                          json.dumps({"sections":row["metrics"]["section_order"],
                                      "intro":row["intro"],"detail_states":len(row["details"])},
                                     ensure_ascii=False),flush=True)
                except Exception as error:
                    row["error"]=type(error).__name__ + ": " + str(error)[:450]
                    print("A00_BASELINE_FAIL",SOURCE,theme,label,row["error"],flush=True)
                    try:
                        row["screen_files"].append(save_screenshot(
                            page,theme+"-"+label+"-diagnostic.png"))
                    except Exception:
                        pass
                finally:
                    results["cases"].append(row)
                    ctx.close()
    finally:
        browser.close()

results["summary"]={
    "passed":sum(x["success"] for x in results["cases"]),
    "total":len(results["cases"]),
    "themes":len(THEMES),
    "viewports":len(VIEWPORTS),
    "screenshots":sum(len(x["screen_files"]) for x in results["cases"]),
    "live_firebase_writes":0,
    "intro_skipped":sum(x["intro"]=="clicked_skip" for x in results["cases"]),
    "section_orders":{t: next((c["metrics"]["section_order"]
                               for c in results["cases"]
                               if c["theme"]==t and c["success"]),[])
                      for t in THEMES},
}
(OUT/"manifest.json").write_text(json.dumps(results,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
(OUT/"SUMMARY.md").write_text(
    "# UI-07-A-00 "+SOURCE+" baseline\n\n"+
    "\n".join("- "+key+": "+str(value) for key,value in results["summary"].items())+
    "\n\nNo app UI changed, no production data written.\n",encoding="utf-8"
)
print("A00_BASELINE_SUMMARY",SOURCE,json.dumps(results["summary"],ensure_ascii=False),flush=True)
if results["summary"]["passed"]!=len(THEMES)*len(VIEWPORTS):
    raise SystemExit("A00 "+SOURCE+" baseline incomplete; inspect manifest for partial evidence")
