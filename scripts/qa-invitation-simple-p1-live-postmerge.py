#!/usr/bin/env python3
"""Read-only 2026-11-10 Firebase live smoke after merging P1 simple cover.

Asserts visual behavior of served public SSR page; does not inspect private
rollout status, mutate customer content, submit forms or write Firebase.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE=os.environ.get("INVITATION_LIVE_BASE","https://invite.msgnote.kr/shin-minje-kim-hyunji").rstrip("/")
OUT=Path("artifacts/invitation-simple-p1-live")
OUT.mkdir(parents=True,exist_ok=True)
THEMES={"simple":0.75,"classic-r":0.8,"romantic":2/3,"gyeol":2/3,"emotional":2/3}
REPORT={
    "source":"Firebase public live website, actual stored test invitation, read-only",
    "created_utc":datetime.now(timezone.utc).isoformat(),
    "pr_merge_sha":"a3b7ab29a22d44dd528a05737878f24254db0e86",
    "does_not_prove_firebase_internal_rollout_sha":True,
    "cases":[],"errors":[],
    "limits":[
        "This is public deployed test wedding data, not local fictional sample photo.",
        "Chrome viewport simulation is not physical Android/iOS.",
        "Do not update past-dated or mixed-couple test data without approval."
    ]
}
def dimensions(page, theme):
    return page.evaluate("""theme => {
        const root=document.querySelector('main[data-design="'+theme+'"]');
        const cover=root?.querySelector('section[aria-labelledby="wedding-cover-title"]');
        const frame=cover?.querySelector('[data-wedding-cover-frame]');
        const title=cover?.querySelector('#wedding-cover-title');
        const image=frame?.querySelector('[data-wedding-cover-photo]');
        const cr=cover?.getBoundingClientRect();
        const fr=frame?.getBoundingClientRect();
        return {
            rootReady:!!root,
            coverReady:!!cover,
            coverColor:cover?getComputedStyle(cover).backgroundColor:null,
            documentColor:root?getComputedStyle(root).backgroundColor:null,
            titleText:title?.textContent?.trim() ?? '',
            titleFont:title?getComputedStyle(title).fontFamily:null,
            titleFontSize:title?parseFloat(getComputedStyle(title).fontSize):null,
            photoWidthPercent:cr&&fr?fr.width/cr.width*100:null,
            photoRatio:fr?fr.width/fr.height:null,
            photoLoaded:!!(image&&image.complete&&image.naturalWidth>0),
            viewportWidth:innerWidth,
            pageWidth:document.documentElement.scrollWidth,
            rootWidth:root?.getBoundingClientRect().width ?? null
        };
    }""",theme)

def capture(page,name,full=False):
    target=OUT/name
    page.screenshot(path=str(target),animations="disabled",full_page=full,timeout=60000)
    raw=target.read_bytes()
    return {"name":name,"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    try:
        probe=browser.new_context(viewport={"width":390,"height":844},reduced_motion="reduce",locale="ko-KR")
        page=probe.new_page()
        # Firebase App Hosting deploys asynchronously after main merges.
        appeared=False
        for attempt in range(25):
            try:
                response=page.goto(BASE+"/simple/",wait_until="domcontentloaded",timeout=40000)
                assert response and response.status==200
                page.locator('main[data-design="simple"]').wait_for(state="visible",timeout=16000)
                page.locator('[data-wedding-cover-photo]').first.wait_for(state="visible",timeout=8000)
                metrics=dimensions(page,"simple")
                appeared=(
                    metrics["coverColor"]=="rgb(250, 249, 246)"
                    and metrics["titleFont"] and "Wedding Myeongjo" in metrics["titleFont"]
                    and abs(metrics["titleFontSize"]-26)<0.5
                    and metrics["photoWidthPercent"] is not None
                    and abs(metrics["photoWidthPercent"]-92)<0.7
                    and metrics["photoRatio"] is not None
                    and abs(metrics["photoRatio"]-.75)<.012
                )
                print("P1_LIVE_PROBE",attempt+1,"visible",appeared,metrics,flush=True)
                if appeared:break
            except Exception as error:
                print("P1_LIVE_PROBE_ERROR",attempt+1,str(error)[:180],flush=True)
            if attempt<24:time.sleep(25)
        REPORT["first_public_new_design_visible"]=appeared
        if not appeared:raise RuntimeError("New simple cover not served within read-only verification window")
        probe.close()

        configs={
            "mobile320":(320,740,2),
            "mobile390":(390,844,2),
            "mobile430":(430,932,2),
            "desktop1440":(1440,900,1),
        }
        for theme,expected_ratio in THEMES.items():
            viewports=configs if theme=="simple" else {"mobile390":configs["mobile390"]}
            for view,(w,h,scale) in viewports.items():
                context=browser.new_context(
                    viewport={"width":w,"height":h},device_scale_factor=scale,
                    locale="ko-KR",color_scheme="light",reduced_motion="reduce"
                )
                page=context.new_page()
                errors=[]
                page.on("pageerror",lambda ex:errors.append(str(ex)[:200]))
                record={"theme":theme,"viewport":view,"passed":False}
                try:
                    response=page.goto(BASE+"/"+theme+"/",wait_until="domcontentloaded",timeout=50000)
                    assert response and response.status==200,"HTTP not 200"
                    page.locator('main[data-design="'+theme+'"]').wait_for(state="visible",timeout=30000)
                    page.locator('[data-wedding-cover-photo]').wait_for(state="visible",timeout=14000)
                    page.wait_for_function("""() => {
                       const img=document.querySelector('[data-wedding-cover-photo]');
                       return img&&img.complete&&img.naturalWidth>0;
                    }""",timeout=25000)
                    m=dimensions(page,theme)
                    record["metrics"]=m
                    assert m["coverReady"] and m["photoLoaded"]
                    assert m["pageWidth"]<=w+1
                    assert abs(m["photoRatio"]-expected_ratio)<0.035,m
                    if theme=="simple":
                        assert m["coverColor"]=="rgb(250, 249, 246)",m
                        assert "Wedding Myeongjo" in m["titleFont"],m
                        assert abs(m["titleFontSize"]-(24 if w<=359 else 26))<0.5,m
                        assert abs(m["photoWidthPercent"]-92)<0.7,m
                    record["screen"]=capture(page,theme+"-"+view+"-deployed.png")
                    if theme=="simple" and view in ("mobile390","desktop1440"):
                        record["full_page"]=capture(page,theme+"-"+view+"-deployed-full.png",True)
                    assert not errors,errors
                    record["passed"]=True
                    print("P1_LIVE_OK",theme,view,flush=True)
                except Exception as e:
                    record["error"]=type(e).__name__+": "+str(e)[:620]
                    REPORT["errors"].append(theme+"/"+view+" "+record["error"])
                    print("P1_LIVE_FAIL",theme,view,record["error"],flush=True)
                finally:
                    REPORT["cases"].append(record)
                    context.close()
    finally:
        browser.close()
REPORT["summary"]={
    "passed":sum(c["passed"] for c in REPORT["cases"]),
    "total":len(REPORT["cases"]),
    "simple_cases":sum(c["passed"] for c in REPORT["cases"] if c["theme"]=="simple"),
    "other_themes":sum(c["passed"] for c in REPORT["cases"] if c["theme"]!="simple"),
}
(OUT/"manifest.json").write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+"\n","utf8")
(OUT/"SUMMARY.md").write_text(
    "# Invitation P1 after-merge public read-only screenshot\n\n"+
    "\n".join("- "+key+": "+str(value) for key,value in REPORT["summary"].items())+
    "\n\nNo edits to actual Firebase event, contacts, images, date, billing or visibility.\n",
    "utf8"
)
print("P1_LIVE_SUMMARY",json.dumps(REPORT["summary"],ensure_ascii=False),flush=True)
if REPORT["summary"]["passed"]!=8 or REPORT["errors"]:
    raise SystemExit("Public wedding style/asset regression after P1 merge")
