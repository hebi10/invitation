#!/usr/bin/env python3
"""Android API35 Chrome smoke of locally served real React wedding UI.

No external Internet is required: Android emulator accesses GitHub runner via 10.0.2.2.
The route is ephemeral, contains fake names, and is NOT deployed or committed.
This is Android emulator QA, not a connected physical device.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlencode

OUT=Path("artifacts/quiet-invitation-3a-android-local")
OUT.mkdir(parents=True,exist_ok=True)
ROOT="http://10.0.2.2:3000/__quiet3a/"
CASES=[(t,"envelope") for t in ("simple","classic-r","romantic","gyeol","emotional")]
CASES.extend([("simple","light"),("simple","cinema")])
manifest={
    "source":"Ephemeral local Next.js, actual five WeddingBase renderer themes + Quiet WeddingIntro",
    "android":"Android API35 emulated Pixel 7 Pro browser",
    "physical_device":False,
    "live_production":False,
    "created":datetime.now(timezone.utc).isoformat(),
    "cases":[],
}

def command(*args,check=True,timeout=35):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                     check=False,timeout=timeout)
    if check and p.returncode:
        raise RuntimeError(str(args)+" returned "+str(p.returncode)+" "+p.stderr.decode("utf8",errors="replace")[-400:])
    return p.stdout.decode("utf8",errors="replace")

def adb(*args,**kwargs):
    return command("adb",*args,**kwargs)

def dump():
    adb("shell","uiautomator","dump","/sdcard/3a-android-local.xml",timeout=25)
    x=adb("exec-out","cat","/sdcard/3a-android-local.xml",timeout=20)
    tree=ET.fromstring(x)
    return tree,x

def text(tree):
    return " ".join((n.get("text","")+" "+n.get("content-desc","")).strip()
                    for n in tree.iter("node"))

def tap(node):
    m=re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]",node.get("bounds",""))
    if not m:return False
    x1,y1,x2,y2=map(int,m.groups())
    adb("shell","input","tap",str((x1+x2)//2),str((y1+y2)//2))
    return True

def dialog_dismiss(tree):
    labels={"accept & continue","use without an account","no thanks","no, thanks",
            "not now","continue without account","continue","got it","ok","skip"}
    for node in tree.iter("node"):
        name=(node.get("text") or node.get("content-desc") or "").strip().lower()
        if name in labels and node.get("enabled")=="true" and tap(node):
            return True
    return False

def screen(filename):
    p=subprocess.run(["adb","exec-out","screencap","-p"],stdout=subprocess.PIPE,
                     stderr=subprocess.PIPE,check=True,timeout=30)
    b=p.stdout
    if not b.startswith(b"\x89PNG\r\n\x1a\n"):raise RuntimeError("No PNG bytes returned")
    (OUT/filename).write_bytes(b)
    return {"file":filename,"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}

manifest["device"]={
    "sdk":adb("shell","getprop","ro.build.version.sdk").strip(),
    "size":adb("shell","wm","size").strip(),
    "density":adb("shell","wm","density").strip(),
    "chromeInstalled":"package:com.android.chrome" in adb("shell","pm","list","packages").splitlines(),
}

for theme,style in CASES:
    url=ROOT+"?"+urlencode({"theme":theme,"style":style})
    record={"theme":theme,"intro":style,"url":url,"success":False}
    try:
        launch=adb("shell","am","start","-W","-a","android.intent.action.VIEW","-d",url,timeout=50)
        record["activity"]=launch.strip()[-300:]
        found=False
        last=""
        for attempt in range(15):
            time.sleep(2)
            try:
                tree,xml=dump()
                labels=text(tree)
                last=labels[-500:]
                if "테스트신랑" in labels and "테스트신부" in labels:
                    found=True
                    (OUT/(theme+"-"+style+"-accessibility.xml")).write_text(xml,encoding="utf8")
                    break
                if dialog_dismiss(tree):
                    adb("shell","am","start","-a","android.intent.action.VIEW","-d",url,check=False)
            except (ET.ParseError,subprocess.TimeoutExpired,subprocess.CalledProcessError):
                pass
        record["names_visible_in_native_accessibility_tree"]=found
        record["ui_hint"]=last[:200]
        record["screen"]=screen(theme+"-"+style+"-android-local.png")
        if not found:
            raise RuntimeError("Local wedding content not present in Android Chrome UI hierarchy")
        if style=="envelope":
            # The opening card is an actual native Android browser touch action.
            for node in tree.iter("node"):
                caption=(node.get("text") or node.get("content-desc") or "").strip()
                if caption=="초대장 열기" and tap(node):
                    time.sleep(2)
                    record["after_open"]=screen(theme+"-"+style+"-after-open.png")
                    record["open_button_tapped"]=True
                    break
            if not record.get("open_button_tapped"):
                record["open_button_tapped"]=False
                raise RuntimeError("Could not verify opening the letter in Android browser")
        record["success"]=True
        print("ANDROID_LOCAL_OK",theme,style,flush=True)
    except Exception as error:
        record["error"]=type(error).__name__+": "+str(error)[:600]
        print("ANDROID_LOCAL_FAIL",theme,style,record["error"],flush=True)
    manifest["cases"].append(record)

manifest["summary"]={"passed":sum(x["success"] for x in manifest["cases"]),
                     "total":len(manifest["cases"])}
(OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n","utf8")
(OUT/"SUMMARY.md").write_text(
    "# Invitation 3-A Android local Next.js Chrome QA\n\n"+
    str(manifest["summary"])+"\n\nNo connected physical hardware. Local synthetic data only.\n","utf8")
print("ANDROID_LOCAL_SUMMARY",manifest["summary"],flush=True)
if manifest["summary"]["passed"]!=len(CASES):
    raise SystemExit("Android local Chrome smoke has unverified cases; inspect screenshots and manifest.")
