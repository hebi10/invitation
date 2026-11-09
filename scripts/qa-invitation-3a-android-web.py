#!/usr/bin/env python3
"""Read-only Android API35 emulator Chrome smoke of 5 live public wedding pages.

No auth, Firebase writes, Kakao send, account actions or purchases.
This is an Android emulator, NOT a connected physical smartphone.
"""
from __future__ import annotations
import hashlib
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

OUT=Path("artifacts/quiet-invitation-3a-android")
OUT.mkdir(parents=True,exist_ok=True)
THEMES=("simple","classic-r","romantic","gyeol","emotional")
BASE="https://invite.msgnote.kr/shin-minje-kim-hyunji"
manifest={
 "source":"Live currently deployed five public wedding pages, read-only",
 "device":"GitHub Actions Android API 35 x86_64 emulator / browser",
 "physical_device_test":False,
 "new_2a_intro_not_deployed":True,
 "created_utc":datetime.now(timezone.utc).isoformat(),
 "cases":[], "errors":[],
}

def cmd(*args,timeout=60,check=True):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                     timeout=timeout,check=False)
    if check and p.returncode!=0:
        raise RuntimeError(str(args)+" -> "+p.stderr.decode("utf8",errors="replace")[-600:])
    return p.stdout.decode("utf8",errors="replace")

def adb(*args,timeout=60,check=True):
    return cmd("adb",*args,timeout=timeout,check=check)

def screenshot(name):
    p=subprocess.run(["adb","exec-out","screencap","-p"],
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=30,check=True)
    data=p.stdout
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError("Android screenshot did not return PNG")
    file=OUT/name
    file.write_bytes(data)
    return {"filename":name,"size_bytes":len(data),
            "sha256":hashlib.sha256(data).hexdigest()}

def hierarchy():
    adb("shell","uiautomator","dump","/sdcard/qa-3a-page.xml",timeout=20)
    xml=adb("exec-out","cat","/sdcard/qa-3a-page.xml",timeout=15)
    return ET.fromstring(xml),xml

def tap_node(node):
    m=re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]",node.get("bounds",""))
    if not m:return False
    x1,y1,x2,y2=map(int,m.groups())
    adb("shell","input","tap",str((x1+x2)//2),str((y1+y2)//2))
    return True

def dismiss_first_run(tree):
    eligible={
       "accept & continue","use without an account","no thanks",
       "no, thanks","not now","continue without account",
       "continue","got it","ok","skip","maybe later",
       "don't use an account","dismiss"
    }
    for node in tree.iter("node"):
        label=(node.get("text") or node.get("content-desc") or "").strip().lower()
        if label in eligible and node.get("enabled")=="true" and tap_node(node):
            print("ANDROID_FIRST_RUN_DISMISS",label,flush=True)
            return True
    return False

properties={
 "size":adb("shell","wm","size").strip(),
 "density":adb("shell","wm","density").strip(),
 "sdk":adb("shell","getprop","ro.build.version.sdk").strip(),
 "packages":adb("shell","pm","list","packages").splitlines(),
}
manifest["device_properties"]={
 "size":properties["size"],"density":properties["density"],"sdk":properties["sdk"],
 "chrome_installed":"package:com.android.chrome" in properties["packages"],
 "aosp_browser_installed":"package:com.android.browser" in properties["packages"]
}
print("ANDROID_3A_DEVICE",manifest["device_properties"],flush=True)

for theme in THEMES:
    url=BASE+"/"+theme+"/"
    record={"theme":theme,"url":url,"ok":False}
    try:
        launch=adb("shell","am","start","-W","-a","android.intent.action.VIEW",
                   "-d",url,timeout=45)
        record["launch_summary"]=launch.strip()[-750:]
        if "unable to resolve" in launch.lower():
            raise RuntimeError("No browser resolved intent")
        ready=False
        last_text=""
        for attempt in range(22):
            time.sleep(2)
            try:
                root,xml=hierarchy()
                visible=" ".join(
                    (n.get("text","")+" "+n.get("content-desc",""))
                    for n in root.iter("node")
                )
                last_text=visible[-900:]
                if "신민제" in visible and "김현지" in visible:
                    ready=True
                    (OUT/(theme+"-ui.xml")).write_text(xml,encoding="utf8")
                    break
                if any(s in visible for s in ("This site can’t be reached","Web page not available","Unable to load")):
                    raise RuntimeError("Android browser displayed a load error")
                if dismiss_first_run(root):
                    time.sleep(1)
                    adb("shell","am","start","-W","-a","android.intent.action.VIEW","-d",url,check=False)
            except (subprocess.CalledProcessError,ET.ParseError,subprocess.TimeoutExpired):
                pass
        record["visible_couple_names"]=ready
        record["last_ui_sample"]=last_text[:300]
        record["screenshot"]=screenshot(theme+"-android-live.png")
        if not ready:
            raise RuntimeError("Could not confirm couple names in Android accessibility tree")
        record["ok"]=True
        print("ANDROID_3A_OK",theme,flush=True)
    except Exception as error:
        record["error"]=type(error).__name__+": "+str(error)[:500]
        manifest["errors"].append(theme+": "+record["error"])
        print("ANDROID_3A_FAIL",theme,record["error"],flush=True)
    finally:
        manifest["cases"].append(record)

manifest["summary"]={
    "passed":sum(x["ok"] for x in manifest["cases"]),
    "total":len(manifest["cases"]),
    "errors":len(manifest["errors"]),
}
(OUT/"android-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n","utf8")
(OUT/"SUMMARY.md").write_text(
    "# Invitation 3-A Android API 35 browser emulator smoke\n\n"+
    "\n".join("- "+k+": "+str(v) for k,v in manifest["summary"].items())+
    "\n\nThis is not a physical Android phone. These live pages may still run previous intros until 3-B deployment.\n",
    "utf8"
)
print("ANDROID_3A_SUMMARY",manifest["summary"],flush=True)
if manifest["summary"]["passed"]!=5:raise SystemExit("At least one live theme was not verified in the Android emulator")
