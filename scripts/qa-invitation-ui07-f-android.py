#!/usr/bin/env python3
"""UI-07-F Android API35 Chrome emulator verification of fictional wedding pages.

This script runs INSIDE the Android Emulator Runner job. It is NOT an Android
or iOS physical device test, and does not run TalkBack, VoiceOver, phone/SMS,
payment, Kakao navigation, or real guestbook submissions.
"""
from __future__ import annotations

import hashlib
import json
import re
import shlex
import subprocess
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from PIL import Image, ImageChops, ImageStat

OUT = Path("artifacts/ui-07-f/android-api35")
OUT.mkdir(parents=True, exist_ok=True)
THEMES = ("simple", "classic-r", "romantic", "gyeol", "emotional")
BASE = "http://127.0.0.1:3000/sample-invitation/"

report = {
    "task": "UI-07-F Chrome on Android emulator",
    "created_utc": datetime.now(timezone.utc).isoformat(),
    "device_type": "Android API35 x86_64 Pixel 7 Pro emulator (not a physical device)",
    "actual_physical_device_tested": False,
    "talkback_or_voiceover_executed": False,
    "real_kakao_or_phone_sms_apps_executed": False,
    "firebase_customer_writes": 0,
    "cases": [],
}


def command(*args, timeout=40, check=True):
    p = subprocess.run(args, capture_output=True, timeout=timeout, check=False)
    if check and p.returncode:
        raise RuntimeError(f"Command failed {args[:3]}: " +
                           p.stderr.decode("utf-8", "replace")[-350:])
    return p.stdout.decode("utf-8", "replace")


def adb(*args, **kwargs):
    return command("adb", *args, **kwargs)


def screen(filename):
    output = OUT / filename
    png = subprocess.run(
        ["adb", "exec-out", "screencap", "-p"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=40
    ).stdout
    assert png.startswith(b"\x89PNG\r\n\x1a\n"), "ADB screen capture invalid"
    output.write_bytes(png)
    return {"file": filename, "bytes": len(png), "sha256": hashlib.sha256(png).hexdigest()}


def hierarchy():
    adb("shell", "uiautomator", "dump", "/sdcard/ui07-f-accessibility.xml", timeout=40)
    raw = adb("exec-out", "cat", "/sdcard/ui07-f-accessibility.xml", timeout=30)
    return ET.fromstring(raw), raw


def text(tree):
    return " ".join(
        (node.get("text", "") + " " + node.get("content-desc", "")).strip()
        for node in tree.iter("node")
    )


def tap(node):
    bounds = re.fullmatch(
        r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]",
        node.get("bounds", "")
    )
    if not bounds:
        return False
    x1, y1, x2, y2 = [int(x) for x in bounds.groups()]
    adb("shell", "input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))
    return True


def dismiss_onboarding(tree):
    labels = text(tree).lower()
    if "enhanced ad privacy in chrome" in labels:
        for name in ("got it", "done", "more", "continue", "no thanks"):
            for node in tree.iter("node"):
                label = (node.get("text") or node.get("content-desc") or "").strip().lower()
                if label == name and node.get("enabled") == "true" and tap(node):
                    return True
        adb("shell", "input", "swipe", "520", "1480", "520", "540", "450")
        return True

    names = {
        "accept & continue", "continue", "use without an account",
        "no thanks", "no, thanks", "not now", "continue without an account",
        "got it", "ok", "skip", "accept", "next"
    }
    for node in tree.iter("node"):
        label = (node.get("text") or node.get("content-desc") or "").strip().lower()
        if label in names and node.get("enabled") == "true" and tap(node):
            return True
    return False


def visit(theme, scale, intro=False):
    if intro:
        query = {"qaTheme": theme, "qaUI07": "1", "qaUI07Case": "full",
                 "qaUI07Intro": "envelope", "embed": "1"}
    else:
        query = {"qaTheme": theme, "qaUI07": "1", "qaUI07Case": "full",
                 "qaMusic": "1", "embed": "1"}
    url = BASE + "?" + urlencode(query)
    record = {"theme": theme, "font_scale_setting": scale,
              "intro": intro, "passed": False, "screens": []}
    adb("shell", "settings", "put", "system", "font_scale", str(scale))
    record["readback_font_scale"] = adb(
        "shell", "settings", "get", "system", "font_scale"
    ).strip()
    try:
        assert abs(float(record["readback_font_scale"]) - scale) < 0.01
        adb("shell",
            "am start -W -a android.intent.action.VIEW -d " + shlex.quote(url),
            timeout=65)
        loaded = False
        last = ""
        invite_button = None
        for attempt in range(23):
            time.sleep(2)
            try:
                tree, raw = hierarchy()
                last = text(tree)
                if intro:
                    buttons = [node for node in tree.iter("node")
                               if (node.get("text") or node.get("content-desc") or "").strip() == "초대장 열기"
                               and node.get("enabled") == "true"
                               and node.get("bounds") not in ("", "[0,0][0,0]")]
                    loaded = "이서준" in last and "김하은" in last and len(buttons) > 0
                    invite_button = buttons[0] if buttons else None
                else:
                    loaded = "이서준" in last and "김하은" in last
                if loaded:
                    xml_file = OUT / (f"{theme}-{str(scale).replace('.', '_')}" +
                                      ("-intro" if intro else "") + "-accessibility.xml")
                    xml_file.write_text(raw, encoding="utf-8")
                    break
                if dismiss_onboarding(tree):
                    time.sleep(1)
                elif attempt in (4, 9, 15):
                    adb("shell",
                        "am start -a android.intent.action.VIEW -d " + shlex.quote(url),
                        check=False)
            except (ET.ParseError, subprocess.TimeoutExpired, RuntimeError, ValueError):
                pass
        record["native_accessibility_tree_has_fictional_couple"] = loaded
        record["screens"].append(screen(
            f"{theme}-{str(scale).replace('.', '_')}" +
            ("-intro" if intro else "") + "-top.png"
        ))
        if not loaded:
            raise RuntimeError("Chrome native hierarchy does not expose both fictional names")

        if intro:
            if invite_button is None or not tap(invite_button):
                raise RuntimeError("Envelope open button inaccessible on emulator")
            opened = False
            for _ in range(9):
                time.sleep(1)
                tree, _ = hierarchy()
                visible_button = any(
                    (n.get("text") or n.get("content-desc") or "").strip() == "초대장 열기"
                    and n.get("bounds") not in ("", "[0,0][0,0]")
                    for n in tree.iter("node")
                )
                if not visible_button and "이서준" in text(tree):
                    opened = True
                    break
            record["screens"].append(screen(f"{theme}-intro-after-open.png"))
            if not opened:
                # Chrome can retain a stale UIAutomator tree even after the
                # React dialog has unmounted. Verify the real rendered screen
                # instead of treating a stale accessibility snapshot as an
                # application failure.
                before = Image.open(OUT / record["screens"][0]["file"]).convert("RGB")
                after = Image.open(OUT / record["screens"][-1]["file"]).convert("RGB")
                width, height = before.size
                assert after.size == before.size, "Emulator viewport changed mid-test"
                region = (int(width * 0.10), int(height * 0.20),
                          int(width * 0.90), int(height * 0.85))
                difference = ImageChops.difference(before.crop(region), after.crop(region))
                mean_difference = round(sum(ImageStat.Stat(difference).mean) / 3, 2)
                record["intro_to_cover_screenshot_mean_difference"] = mean_difference
                before_bytes = record["screens"][0]["bytes"]
                after_bytes = record["screens"][-1]["bytes"]
                record["intro_to_cover_screen_bytes"] = [before_bytes, after_bytes]
                opened = mean_difference >= 25 and after_bytes > before_bytes * 3
                record["intro_to_cover_verified_by"] = (
                    "rendered screenshot pixel change + photo complexity"
                    if opened else "not confirmed"
                )
            else:
                record["intro_to_cover_verified_by"] = "Android accessibility hierarchy"
            record["envelope_opened_to_cover"] = opened
            if not opened:
                raise RuntimeError("Envelope did not transition to visible cover")
        else:
            adb("shell", "input", "swipe", "520", "1650", "520", "560", "520")
            time.sleep(1)
            record["screens"].append(screen(
                f"{theme}-{str(scale).replace('.', '_')}-scrolled.png"
            ))
        record["passed"] = True
        print("UI07F_ANDROID_OK", theme, scale, "intro" if intro else "page", flush=True)
    except Exception as exc:
        record["error"] = type(exc).__name__ + ": " + str(exc)[:550]
        record["last_visible_labels"] = last[:180]
        print("UI07F_ANDROID_FAIL", theme, scale, record["error"], flush=True)
    report["cases"].append(record)


report["device"] = {
    "android_api": adb("shell", "getprop", "ro.build.version.sdk").strip(),
    "hardware_model": adb("shell", "getprop", "ro.product.model").strip(),
    "wm_size": adb("shell", "wm", "size").strip(),
    "wm_density": adb("shell", "wm", "density").strip(),
    "chrome_installed": "package:com.android.chrome" in adb(
        "shell", "pm", "list", "packages"
    ).splitlines(),
}
assert report["device"]["android_api"] == "35", "Expected API35 emulator"
assert report["device"]["chrome_installed"], "Chrome not installed"
adb("reverse", "tcp:3000", "tcp:3000")
try:
    for value in (1.0, 1.6):
        for name in THEMES:
            visit(name, value)
    visit("simple", 1.0, intro=True)
finally:
    adb("shell", "settings", "put", "system", "font_scale", "1.0", check=False)

report["summary"] = {
    "total": len(report["cases"]),
    "passed": sum(row["passed"] for row in report["cases"]),
    "native_accessibility_xml_files": len(list(OUT.glob("*-accessibility.xml"))),
    "screenshots": len(list(OUT.glob("*.png"))),
    "failed": [
        {"theme": row["theme"], "scale": row["font_scale_setting"], "intro": row["intro"],
         "error": row.get("error")}
        for row in report["cases"] if not row["passed"]
    ],
}
(OUT / "manifest.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print("UI07F_ANDROID_SUMMARY", json.dumps(report["summary"], ensure_ascii=False), flush=True)
if report["summary"]["passed"] != report["summary"]["total"]:
    raise SystemExit("UI-07-F Android emulator QA has unverified states")
