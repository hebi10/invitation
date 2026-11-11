#!/usr/bin/env python3
"""UI-07-D isolated synthetic map visual and interaction QA.

The Kakao SDK is mocked only within a Playwright browser context.
No external Kakao request, phone, payment or Firestore customer data is used.
This is not a verification of the live Kakao Maps service.
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

BASE = os.environ.get("INVITATION_UI07D_BASE", "http://127.0.0.1:3000").rstrip("/")
OUT = Path("artifacts/ui-07-d")
OUT.mkdir(parents=True, exist_ok=True)
THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")
SIZES = ((320, 740), (390, 844), (430, 932), (768, 1024), (1440, 900))

FAKE_KAKAO_SDK = r"""
(config) => {
  const qa = { maps: [], geocoderQueries: [], markerCount: 0, failed: config.fail };
  window.__ui07dMock = qa;
  function LatLng(latitude, longitude) {
    this.latitude = latitude;
    this.longitude = longitude;
  }
  function Map(container, options) {
    if (config.fail) throw Error('Synthetic map engine failure');
    qa.maps.push(this);
    this.zoomable = null;
    this.draggable = null;
    this.history = [];
    this.relayout = () => { this.history.push('relayout'); };
    this.setCenter = (value) => { this.history.push('setCenter'); };
    this.setZoomable = (enabled) => {
      this.zoomable = enabled;
      this.history.push('zoom:' + enabled);
    };
    this.setDraggable = (enabled) => {
      this.draggable = enabled;
      this.history.push('drag:' + enabled);
    };
    const placeholder = document.createElement('div');
    placeholder.setAttribute('data-ui07d-synthetic-map', 'true');
    Object.assign(placeholder.style, {
      display: 'grid', placeItems: 'center',
      width: '100%', height: '100%', background: '#e8eae7',
      color: '#414741', fontSize: '15px', lineHeight: '1.6',
      fontFamily: 'system-ui, sans-serif', textAlign: 'center'
    });
    placeholder.textContent = '가상 지도 · UI 검증 전용';
    container.appendChild(placeholder);
  }
  function Marker() {
    qa.markerCount++;
    this.setMap = () => { qa.markerCount--; };
  }
  function Geocoder() {
    this.addressSearch = (address, callback) => {
      qa.geocoderQueries.push(address);
      callback([{ x: '127.00002', y: '37.50002' }], 'OK');
    };
  }
  window.kakao = {
    maps: {
      load: (callback) => callback(),
      LatLng, Map, Marker,
      services: { Geocoder, Status: { OK: 'OK' } }
    }
  };
}
"""

report = {
    "task": "UI-07-D",
    "source": "development-only qaUI07Map on synthetic five-theme wedding sample",
    "map_sdk": "deterministic in-browser Kakao SDK test double; not a real external Kakao Map",
    "created_utc": datetime.now(timezone.utc).isoformat(),
    "customer_data_reads_or_writes": 0,
    "external_sdk_requests": 0,
    "external_link_clicks": 0,
    "real_devices_tested": False,
    "cases": [],
}


def capture(page, theme, width, mode, suffix, target):
    path = OUT / f"{theme}-{width}-{mode}-{suffix}.png"
    target.screenshot(path=str(path), animations="disabled", timeout=45000)
    contents = path.read_bytes()
    return {
        "file": path.name,
        "sha256": hashlib.sha256(contents).hexdigest(),
        "bytes": len(contents),
    }


def measure(page):
    return page.evaluate("""() => {
      const map = document.querySelector('main[data-design] [data-map-status]');
      const frame = map.querySelector('[class*="viewport"]');
      const control = map.querySelector('button[aria-pressed]');
      const qa = window.__ui07dMock;
      const box = frame.getBoundingClientRect();
      const main = document.querySelector('main[data-design]').getBoundingClientRect();
      return {
        frame_width: Math.round(box.width * 10) / 10,
        frame_height: Math.round(box.height * 10) / 10,
        ratio: Math.round(box.width / box.height * 100) / 100,
        main_width: Math.round(main.width * 10) / 10,
        main_left: Math.round(main.left * 10) / 10,
        viewport_width: innerWidth,
        horizontal_overflow: document.documentElement.scrollWidth > innerWidth + 2,
        map_status: map.dataset.mapStatus,
        control_rect: control ? control.getBoundingClientRect().toJSON() : null,
        map_pointer_events: getComputedStyle(map.querySelector('[role="img"]')).pointerEvents,
        sdk_created: qa?.maps.length ?? 0,
        geocoder_queries: qa?.geocoderQueries.length ?? 0,
        map_history: qa?.maps[0]?.history ?? [],
      };
    }""")


def verify(page, theme, width, mode, record, font_x2):
    main = page.locator(f'main[data-design="{theme}"]')
    main.wait_for(state="visible", timeout=35000)
    page.evaluate("document.fonts.ready")
    page.add_style_tag(content="nextjs-portal { display: none !important; }")
    section = main.locator('[data-wedding-section="schedule"]')
    map_surface = section.locator('[data-map-status]')
    map_surface.wait_for(state="visible", timeout=30000)
    map_surface.scroll_into_view_if_needed()

    expected_status = "failed" if mode == "failure" else "ready"
    page.locator(f'[data-map-status="{expected_status}"]').wait_for(
        state="visible", timeout=22000
    )
    if font_x2:
        page.evaluate("""() => {
          document.querySelectorAll(
            'main[data-design] [data-map-status] :is(a, button, span, p)'
          ).forEach(el => {
            const size = parseFloat(getComputedStyle(el).fontSize);
            if (Number.isFinite(size)) el.style.fontSize = size * 2 + 'px';
          });
        }""")

    data = measure(page)
    record["metrics"] = data
    assert data["map_status"] == expected_status
    assert not data["horizontal_overflow"], ("horizontal overflow", mode, theme, width)
    assert data["frame_height"] >= 207, "Map min-height should stay usable"
    assert data["frame_height"] <= 294, "Map must not grow beyond the visual limit"
    if width >= 768:
        assert abs(data["main_width"] - 480) <= 2, data
        assert abs(data["main_left"] - (width - 480) / 2) <= 2, data

    if mode == "failure":
        assert map_surface.get_by_role("button", name="지도 확대·이동").count() == 0
        fallback = map_surface.get_by_role("link", name="지도에서 위치 보기")
        assert fallback.count() == 1 and fallback.is_visible()
        assert fallback.get_attribute("href").startswith("https://")
        assert fallback.get_attribute("target") == "_blank"
        assert fallback.get_attribute("rel") == "noopener noreferrer"
        assert map_surface.locator('[class*="actions"] a').count() == 0
        if width == 390:
            record["screens"].append(capture(page, theme, width, mode, "fallback", map_surface))
        return

    assert data["sdk_created"] == 1, "SDK test-double should initialize exactly one map"
    assert data["map_pointer_events"] == "none", "static map should allow page scrolling"
    assert map_surface.locator('[data-ui07d-synthetic-map="true"]').count() == 1
    assert map_surface.locator('button[aria-pressed]').count() == 1, "single move control"
    button = map_surface.get_by_role("button", name="지도 확대·이동")
    rect = button.bounding_box()
    assert rect and rect["height"] >= 47.5 and rect["width"] >= 47.5, "48px map control"
    assert button.get_attribute("aria-pressed") == "false"
    assert map_surface.locator('[class*="mapHint"]').is_visible()

    links = map_surface.locator('nav[aria-label="지도 바로가기"] a')
    assert links.count() == 2, "route and large map must have two separate external links"
    directions = map_surface.get_by_role("link", name="지도 앱에서 길찾기")
    assert directions.count() == 1 and directions.is_visible()
    assert "/link/to/" in directions.get_attribute("href")
    assert map_surface.get_by_role("link", name="큰 지도 보기").count() == (0 if theme == "emotional" else 1)
    assert map_surface.get_by_role("link", name="카카오맵 보기").count() == (1 if theme == "emotional" else 0)
    for index in range(links.count()):
        link = links.nth(index)
        bounds = link.bounding_box()
        assert bounds and bounds["height"] >= 47.5 and bounds["width"] >= 47.5
        assert link.get_attribute("target") == "_blank"
        assert link.get_attribute("rel") == "noopener noreferrer"
        assert link.get_attribute("href").startswith("https://map.kakao.com/")
        assert link.locator("svg[aria-hidden='true']").count() == 1, "functional map icon missing"

    if mode == "geocode":
        assert data["geocoder_queries"] == 1, "address fallback should geocode once"
        assert "37.50002,127.00002" in directions.get_attribute("href")
    else:
        assert data["geocoder_queries"] == 0, "valid saved coordinates must avoid geocoder"
        assert "37.50001,127.00001" in directions.get_attribute("href")

    if width in (390, 1440) and not font_x2:
        page.evaluate("document.activeElement?.blur()")
        record["screens"].append(capture(page, theme, width, mode, "map-ready", map_surface))

    button.click(timeout=15000)
    assert button.get_attribute("aria-pressed") == "true"
    assert map_surface.locator('[role="img"]').evaluate(
        "(el) => getComputedStyle(el).pointerEvents"
    ) == "auto"
    assert "지도 조작" in map_surface.locator('[class*="mapHint"]').inner_text()
    state = page.evaluate("""() => ({
      zoom: window.__ui07dMock.maps[0].zoomable,
      drag: window.__ui07dMock.maps[0].draggable
    })""")
    assert state == {"zoom": True, "drag": True}, state
    button.focus()
    page.keyboard.press("Escape")
    assert button.get_attribute("aria-pressed") == "false", "Escape should restore static map"
    assert map_surface.locator('[role="img"]').evaluate(
        "(el) => getComputedStyle(el).pointerEvents"
    ) == "none"
    state = page.evaluate("""() => ({
      zoom: window.__ui07dMock.maps[0].zoomable,
      drag: window.__ui07dMock.maps[0].draggable
    })""")
    assert state == {"zoom": False, "drag": False}, state
    if font_x2:
        record["screens"].append(capture(page, theme, width, mode, "text200", map_surface))


with sync_playwright() as engine:
    browser = engine.chromium.launch(
        headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    try:
        cases = [(theme, width, height, "coordinates", False)
                 for theme in THEMES for width, height in SIZES]
        cases += [(theme, 390, 844, "geocode", False) for theme in THEMES]
        cases += [(theme, 390, 844, "failure", False) for theme in THEMES]
        cases += [(theme, 390, 844, "coordinates", True) for theme in THEMES]

        for theme, width, height, mode, font_x2 in cases:
            context = browser.new_context(
                viewport={"width": width, "height": height},
                device_scale_factor=1 if width >= 768 else 2,
                locale="ko-KR", color_scheme="light", reduced_motion="reduce",
            )
            context.add_init_script(
                script="(" + FAKE_KAKAO_SDK + ")({ fail: " +
                       ("true" if mode == "failure" else "false") + " })"
            )
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)[:350]))
            record = {
                "theme": theme, "width": width, "mode": mode,
                "font_200": font_x2, "passed": False, "screens": [],
            }
            try:
                query = urlencode({
                    "qaTheme": theme, "qaUI07": "1",
                    "qaUI07Case": "full",
                    "qaUI07Map": "geocode" if mode == "geocode" else "coordinates",
                    "embed": "1",
                })
                response = page.goto(
                    BASE + "/sample-invitation/?" + query,
                    wait_until="domcontentloaded", timeout=90000
                )
                assert response and response.status == 200, "isolated fixture status"
                verify(page, theme, width, mode, record, font_x2)
                assert not errors, errors
                record["passed"] = True
                print("UI07D_OK", theme, width, mode, "text200" if font_x2 else "normal", flush=True)
            except Exception as error:
                record["error"] = type(error).__name__ + ": " + str(error)[:1400]
                print("UI07D_FAIL", theme, width, mode, record["error"], flush=True)
                try:
                    record["screens"].append(capture(
                        page, theme, width, mode, "error", page.locator("body")
                    ))
                except Exception:
                    pass
            finally:
                report["cases"].append(record)
                context.close()
    finally:
        browser.close()

report["summary"] = {
    "passed": sum(row["passed"] for row in report["cases"]),
    "total": len(report["cases"]),
    "images": sum(len(row["screens"]) for row in report["cases"]),
    "failures": [
        {"theme": row["theme"], "width": row["width"], "mode": row["mode"], "error": row.get("error")}
        for row in report["cases"] if not row["passed"]
    ],
    "production_writes": 0,
}
(OUT / "manifest.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print("UI07D_SUMMARY", json.dumps(report["summary"], ensure_ascii=False), flush=True)
if report["summary"]["passed"] != report["summary"]["total"]:
    raise SystemExit("UI-07-D synthetic map QA failed")
