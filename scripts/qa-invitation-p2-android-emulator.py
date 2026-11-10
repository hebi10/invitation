#!/usr/bin/env python3
"""Android API 35 Chrome on a hosted emulator, NOT a physical-device acceptance test."""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

OUTPUT = Path("artifacts/invitation-p2-android-emulator")
OUTPUT.mkdir(parents=True, exist_ok=True)
BASE = "http://10.0.2.2:3000/sample-invitation/"
THEMES = ("classic-r", "emotional")
report = {
    "source": "local isolated fictional sample on GitHub hosted Android emulator",
    "device_kind": "Android API35 Pixel 7 Pro emulator (NOT a physical device)",
    "real_device_tested": False,
    "production_event_changed": False,
    "created_utc": datetime.now(timezone.utc).isoformat(),
    "cases": [],
}


def shell(*args, timeout=35, check=True):
    result = subprocess.run(args, capture_output=True, timeout=timeout, check=False)
    if check and result.returncode:
        raise RuntimeError("command failed: " + str(args[:3]) + ": " + result.stderr.decode("utf-8", "replace")[-400:])
    return result.stdout.decode("utf-8", "replace")


def adb(*args, **kwargs):
    return shell("adb", *args, **kwargs)


def grab(name):
    proc = subprocess.run(["adb", "exec-out", "screencap", "-p"], capture_output=True, check=True, timeout=40)
    payload = proc.stdout
    if not payload.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError("Android emulator screenshot is not a PNG")
    (OUTPUT / name).write_bytes(payload)
    return {"name": name, "size": len(payload), "sha256": hashlib.sha256(payload).hexdigest()}


def tree_text(root):
    return " ".join(((node.get("text") or "") + " " + (node.get("content-desc") or "")) for node in root.iter("node"))


def hierarchy():
    adb("shell", "uiautomator", "dump", "/sdcard/invitation-p2.xml", timeout=30)
    xml = adb("exec-out", "cat", "/sdcard/invitation-p2.xml", timeout=25)
    return ET.fromstring(xml), xml


def dismiss_first_run(root):
    prompts = {
        "accept & continue", "continue", "no thanks", "no, thanks",
        "use without an account", "not now", "got it", "ok", "skip",
    }
    for node in root.iter("node"):
        label = ((node.get("text") or node.get("content-desc") or "").strip().lower())
        if label not in prompts or node.get("enabled") != "true":
            continue
        bounds = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.get("bounds", ""))
        if bounds:
            x1, y1, x2, y2 = map(int, bounds.groups())
            adb("shell", "input", "tap", str((x1+x2)//2), str((y1+y2)//2))
            return True
    return False


report["device"] = {
    "sdk": adb("shell", "getprop", "ro.build.version.sdk").strip(),
    "resolution": adb("shell", "wm", "size").strip(),
    "density": adb("shell", "wm", "density").strip(),
    "chrome": "package:com.android.chrome" in adb("shell", "pm", "list", "packages"),
}
if report["device"]["sdk"] != "35" or not report["device"]["chrome"]:
    raise SystemExit("Expected Android API 35 with installed Chrome")

for theme in THEMES:
    url = BASE + "?" + urlencode({"qaTheme": theme, "embed": "1"})
    result = {"theme": theme, "passed": False}
    try:
        adb("shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", url, timeout=60)
        loaded = False
        last_text = ""
        for attempt in range(18):
            time.sleep(2)
            try:
                tree, xml = hierarchy()
                last_text = tree_text(tree)
                if "이서준" in last_text and "김하은" in last_text:
                    loaded = True
                    (OUTPUT / (theme + "-accessibility.xml")).write_text(xml, encoding="utf-8")
                    break
                if dismiss_first_run(tree) or attempt in (4, 9, 14):
                    adb("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", url, check=False)
            except (ET.ParseError, subprocess.TimeoutExpired, RuntimeError):
                pass
        result["wedding_couple_visible_in_native_accessibility_tree"] = loaded
        result["screen"] = grab(theme + "-android-cover.png")
        if not loaded:
            raise RuntimeError("Chrome did not expose fictional couple names in Android accessibility hierarchy")
        adb("shell", "input", "swipe", "520", "1650", "520", "520", "550")
        time.sleep(2)
        result["scrolled_screen"] = grab(theme + "-android-scrolled.png")
        result["passed"] = True
        print("P2_ANDROID_EMULATOR_OK", theme, flush=True)
    except Exception as error:
        result["error"] = type(error).__name__ + ": " + str(error)[:900]
        result["last_visible_text"] = last_text[:200]
        print("P2_ANDROID_EMULATOR_FAIL", theme, result["error"], flush=True)
    report["cases"].append(result)

report["summary"] = {
    "passed": sum(1 for entry in report["cases"] if entry["passed"]),
    "total": len(report["cases"]),
}
(OUTPUT / "manifest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("P2_ANDROID_EMULATOR_SUMMARY", json.dumps(report["summary"]), flush=True)
if report["summary"]["passed"] != report["summary"]["total"]:
    raise SystemExit("P2 Android emulated Chrome QA needs follow-up")
