#!/usr/bin/env python3
"""UI-07-E: five-theme wedding music control, state and placement verification.

Runs the real React component with a deterministic browser audio-method test double.
No music stream is played and no customer/production Firebase data is requested.
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_UI07E_BASE", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/ui-07-e")
OUT.mkdir(parents=True, exist_ok=True)
THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")
VIEWPORTS = ((320, 740), (390, 844), (430, 932), (768, 1024), (1440, 900))

FAKE_AUDIO = r"""() => {
  const paused = new WeakMap();
  Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    get() { return paused.has(this) ? paused.get(this) : true; }
  });
  HTMLMediaElement.prototype.play = function() {
    if (window.__ui07eRejectNextMusicPlay === true) {
      window.__ui07eRejectNextMusicPlay = false;
      return Promise.reject(new DOMException('Synthetic audio decoding error', 'NotSupportedError'));
    }
    paused.set(this, false);
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function() {
    paused.set(this, true);
    this.dispatchEvent(new Event('pause'));
  };
  HTMLMediaElement.prototype.load = function() {
    paused.set(this, true);
  };
}"""

report = {
    "task": "UI-07-E",
    "source": "development sample WeddingBase and BackgroundMusic with synthetic audio play/pause",
    "no_real_audio_stream_or_external_launch": True,
    "no_production_firestore_requests_or_writes": True,
    "actual_device_tests": False,
    "captured_utc": datetime.now(timezone.utc).isoformat(),
    "cases": [],
}


def capture(page, theme, width, state):
    path = OUT / f"{theme}-{width}-{state}.png"
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(80)
    main = page.locator(f'main[data-design="{theme}"]').bounding_box()
    assert main
    box = {"x": max(0, round(main["x"] - (16 if width >= 600 else 0))),
           "y": 0,
           "width": min(width, round(main["width"] + (32 if width >= 600 else 0))),
           "height": min(290, page.viewport_size["height"])}
    page.screenshot(path=str(path), clip=box, animations="disabled", timeout=45000)
    return {
        "file": path.name,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "bytes": path.stat().st_size,
    }


def measure(page, theme):
    return page.evaluate("""theme => {
      const main = document.querySelector('main[data-design="' + theme + '"]');
      const player = document.querySelector('[class*="musicPlayer"][class*="invitationAligned"]');
      const control = player?.querySelector('button[aria-pressed]');
      const rect = el => {
        const r = el?.getBoundingClientRect();
        return r ? {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom} : null;
      };
      return {
        viewport: [innerWidth, innerHeight],
        main: rect(main), player: rect(player), button: rect(control),
        button_position: getComputedStyle(player).position,
        player_z_index: getComputedStyle(player).zIndex,
        button_background: getComputedStyle(control).backgroundColor,
        button_color: getComputedStyle(control).color,
        button_radius: getComputedStyle(control).borderRadius,
        button_outline: getComputedStyle(control).outlineStyle,
        music_state: control.dataset.weddingMusicState,
        horizontal_overflow: document.documentElement.scrollWidth > innerWidth + 1
      };
    }""", theme)


def verify(page, theme, width, scenario, row):
    main = page.locator(f'main[data-design="{theme}"]')
    main.wait_for(state="visible", timeout=40000)
    music = page.locator('[class*="musicPlayer"][class*="invitationAligned"]').first
    music.wait_for(state="visible", timeout=25000)
    page.evaluate("document.fonts.ready")
    page.add_style_tag(content="nextjs-portal { display:none !important; }")
    button = music.locator('button[aria-pressed]')
    assert button.count() == 1
    assert button.get_attribute("aria-label") == "음악 켜기"
    assert button.get_attribute("aria-pressed") == "false"
    assert button.get_attribute("data-wedding-music-state") == "paused"
    assert button.locator('svg[data-wedding-music-icon="paused"][aria-hidden="true"]').count() == 1
    assert music.locator('[class*="controlIcon"]').count() == 0, "Old glyph must not appear in wedding music"
    assert not page.evaluate("document.documentElement.scrollWidth > innerWidth + 1")

    if scenario == "text200":
        page.evaluate("""() => document.querySelectorAll(
          '[class*="musicPlayer"] :is(span,p,button)'
        ).forEach(el => {
          const fontSize = parseFloat(getComputedStyle(el).fontSize);
          if (Number.isFinite(fontSize)) el.style.fontSize = fontSize * 2 + 'px';
        })""")

    first = measure(page, theme)
    row["initial"] = first
    assert first["button_position"] == "fixed"
    assert first["player_z_index"] == "30"
    assert first["button_radius"] == "0px"
    assert first["button"]["width"] >= 47.5 and first["button"]["height"] >= 47.5
    assert first["button"]["x"] >= first["main"]["x"] + 7, "button outside wedding canvas"
    assert first["button"]["right"] <= first["main"]["right"] - 7, "button outside wedding canvas"
    assert first["button"]["y"] >= 12, "button collides with top safe-area"
    assert not first["horizontal_overflow"]
    if width >= 768:
        assert abs(first["main"]["width"] - 480) <= 2
        assert abs(first["main"]["x"] - (width - 480) / 2) <= 2
    if width in (390, 1440) and scenario == "basic":
        row["screens"].append(capture(page, theme, width, "paused"))

    if scenario == "error":
        page.evaluate("window.__ui07eRejectNextMusicPlay = true")
        button.click()
        retry = music.get_by_role("button", name="음악 다시 시도")
        retry.wait_for(state="visible", timeout=4000)
        assert retry.get_attribute("aria-pressed") == "false"
        assert retry.get_attribute("data-wedding-music-state") == "error"
        assert retry.locator('svg[data-wedding-music-icon="error"]').count() == 1
        assert music.get_by_role("status").count() == 1
        assert music.get_by_role("button", name="음악 안내 닫기").count() == 1
        row["screens"].append(capture(page, theme, width, "error"))
        dismiss = music.get_by_role("button", name="음악 안내 닫기")
        dismiss.click()
        assert music.get_by_role("status").count() == 0
        assert retry.evaluate("(el) => document.activeElement === el"), "focus did not return after dismiss"
        retry.click()
        assert music.get_by_role("button", name="음악 끄기").is_visible()
        assert music.get_by_role("status").count() == 0
        return

    button.click()
    playing = music.get_by_role("button", name="음악 끄기")
    assert playing.get_attribute("aria-pressed") == "true"
    assert playing.get_attribute("data-wedding-music-state") == "playing"
    assert playing.locator('svg[data-wedding-music-icon="playing"]').count() == 1
    assert music.locator('[class*="musicPlayer"] svg').count() == 0
    now = measure(page, theme)
    assert now["button_background"] != first["button_background"], "music on state must be visually distinct"
    assert not now["horizontal_overflow"]
    if width == 390 and scenario == "basic":
        row["screens"].append(capture(page, theme, width, "playing"))
    playing.click()
    off = music.get_by_role("button", name="음악 켜기")
    assert off.get_attribute("aria-pressed") == "false"
    assert off.get_attribute("data-wedding-music-state") == "paused"
    assert off.locator('svg[data-wedding-music-icon="paused"]').count() == 1

    if scenario == "text200":
        row["screens"].append(capture(page, theme, width, "text200"))
    if scenario == "basic":
        page.evaluate("window.scrollTo(0, document.body.scrollHeight - innerHeight)")
        scrolled = button.bounding_box()
        assert scrolled and abs(scrolled["y"] - first["button"]["y"]) <= 2, "floating control moved while scrolling"


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        cases = [(theme, width, height, "basic")
                 for theme in THEMES for width, height in VIEWPORTS]
        cases += [(theme, 390, 844, "error") for theme in THEMES]
        cases += [(theme, 390, 844, "text200") for theme in THEMES]
        limit = int(os.environ.get("INVITATION_UI07E_LIMIT", "0"))
        if limit > 0:
            cases = cases[:limit]
        for theme, width, height, scenario in cases:
            context = browser.new_context(
                viewport={"width": width, "height": height},
                device_scale_factor=1 if width >= 768 else 2,
                locale="ko-KR", color_scheme="light", reduced_motion="reduce",
            )
            context.add_init_script(script="(" + FAKE_AUDIO + ")()")
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)[:300]))
            row = {"theme": theme, "width": width, "scenario": scenario,
                   "passed": False, "screens": []}
            try:
                query = urlencode({"qaTheme": theme, "qaMusic": "1", "embed": "1"})
                response = page.goto(BASE + "/sample-invitation/?" + query,
                                     wait_until="domcontentloaded", timeout=90000)
                assert response and response.status == 200, "local sample HTTP status"
                verify(page, theme, width, scenario, row)
                assert not errors, errors
                row["passed"] = True
                print("UI07E_OK", theme, width, scenario, flush=True)
            except Exception as exc:
                row["error"] = type(exc).__name__ + ": " + str(exc)[:1500]
                print("UI07E_FAIL", theme, width, scenario, row["error"], flush=True)
                try:
                    row["screens"].append(capture(page, theme, width, "failed"))
                except Exception:
                    pass
            finally:
                report["cases"].append(row)
                context.close()
            if not row["passed"]:
                print("UI07E_ABORT_AFTER_FIRST_FAILURE", flush=True)
                break
    finally:
        browser.close()

report["summary"] = {
    "passed": sum(x["passed"] for x in report["cases"]),
    "total": len(report["cases"]),
    "screenshots": sum(len(x["screens"]) for x in report["cases"]),
    "failures": [{k: x.get(k) for k in ("theme", "width", "scenario", "error")}
                 for x in report["cases"] if not x["passed"]],
    "production_writes": 0,
}
(OUT / "manifest.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print("UI07E_SUMMARY", json.dumps(report["summary"], ensure_ascii=False), flush=True)
if report["summary"]["passed"] != report["summary"]["total"]:
    raise SystemExit("UI-07-E music control visual QA failed")
