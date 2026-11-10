#!/usr/bin/env python3
"""3-B post-merge read-only smoke: Firebase App Hosting public website.

The script cannot access the private Firebase App Hosting rollout API. It verifies
that the *served* web app contains the new Quiet Invitation renderer and that the
five production public wedding routes still work. Does not modify customer data.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as BrowserTimeout

BASE=os.getenv("INVITATION_3B_LIVE_BASE","https://invite.msgnote.kr").rstrip("/")
OUT=Path("artifacts/quiet-invitation-3b-live")
OUT.mkdir(parents=True,exist_ok=True)
STYLES=("light","cinema","envelope")
THEMES=("simple","classic-r","romantic","gyeol","emotional")
DEVICE={
 "mobile390":dict(viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True,has_touch=True),
 "desktop1440":dict(viewport={"width":1440,"height":900},device_scale_factor=1,is_mobile=False,has_touch=False),
}
records={"recorded_at_utc":datetime.now(timezone.utc).isoformat(),
         "base":BASE,"check_type":"Public website visible renderer check (not App Hosting API rollout record)",
         "intro":[],"themes":[],
         "does_not_prove_exact_backend_git_sha":True,
         "does_not_write_to_firebase":True}
def capture(page,name):
    file=OUT/name
    page.screenshot(path=str(file),timeout=30000,animations="allow")
    b=file.read_bytes()
    return {"name":name,"size":len(b),"sha256":hashlib.sha256(b).hexdigest()}

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    try:
        probe=browser.new_context(viewport={"width":390,"height":844},locale="ko-KR")
        page=probe.new_page()
        # App Hosting deploy can continue after GitHub main CI. Poll for the
        # actual new renderer, not only an HTTP 200 from an old revision.
        found=False
        for attempt in range(25):
            result=None
            try:
                response=page.goto(BASE+"/mobile-intro-preview/?style=envelope",wait_until="domcontentloaded",timeout=40000)
                if response and response.status==200:
                    page.locator('[data-wedding-intro="envelope"][data-intro-style="envelope"] [data-letter-open]').wait_for(
                        state="visible",timeout=7000)
                    result="new-renderer-visible"
                    found=True
                    break
                result="http-"+str(response.status if response else "unknown")
            except Exception as e:
                result=type(e).__name__
            print("3B_LIVE_PROBE",attempt+1,result,flush=True)
            if attempt<24:time.sleep(28)
        probe.close()
        if not found:raise RuntimeError("The new Quiet Invitation renderer did not appear on live web within the check window")

        for view,config in DEVICE.items():
            for style in STYLES:
                ctx=browser.new_context(**config,locale="ko-KR",reduced_motion="no-preference")
                page=ctx.new_page()
                errors=[]
                page.on("pageerror",lambda exc:errors.append(str(exc)[:240]))
                result={"view":view,"style":style}
                try:
                    response=page.goto(BASE+"/mobile-intro-preview/?style="+style,wait_until="domcontentloaded",timeout=45000)
                    assert response and response.status==200
                    intro=page.locator('[data-wedding-intro="'+style+'"][data-intro-style="'+style+'"]')
                    intro.wait_for(state="visible",timeout=12000)
                    assert page.locator('[data-skip]').bounding_box()["height"]>=48
                    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
                    if style=="envelope":
                        assert page.locator("[data-letter-open]").is_visible()
                        assert page.locator("[data-flap],[data-seal],[data-card-flight]").count()==0
                        result["capture"]=capture(page,view+"-"+style+"-live.png")
                        page.locator("[data-letter-open]").click()
                    else:
                        if style=="cinema":
                            page.wait_for_function("""() => {
                              const photo=document.querySelector('[data-intro-photo]');
                              return !!photo && photo.complete && photo.naturalWidth>0
                                && !photo.hidden && getComputedStyle(photo).display!=='none';
                            }""",timeout=7000)
                            result["photo_loaded_before_capture"]=True
                            result["photo_natural_width"]=page.locator('[data-intro-photo]').evaluate(
                                "(photo) => photo.naturalWidth")
                        page.wait_for_function("""() => {
                          const copy=document.querySelector('[data-intro-copy]');
                          return !!copy && parseFloat(getComputedStyle(copy).opacity)>0.95;
                        }""",timeout=7000)
                        assert page.locator("[data-shutter],[data-glow]").count()==0
                        result["capture"]=capture(page,view+"-"+style+"-live.png")
                    intro.wait_for(state="detached",timeout=7000)
                    assert page.locator('[data-wedding-intro-pending]').count()==0
                    assert not errors,errors
                    result["passed"]=True
                    print("3B_LIVE_INTRO_OK",view,style,flush=True)
                except Exception as e:
                    result["passed"]=False
                    result["error"]=type(e).__name__+": "+str(e)[:800]
                    print("3B_LIVE_INTRO_FAILED",view,style,result["error"],flush=True)
                finally:
                    records["intro"].append(result)
                    ctx.close()

        for theme in THEMES:
            ctx=browser.new_context(viewport={"width":390,"height":844},locale="ko-KR",reduced_motion="reduce")
            page=ctx.new_page()
            result={"theme":theme,"url":BASE+"/shin-minje-kim-hyunji/"+theme+"/"}
            try:
                response=page.goto(result["url"],wait_until="domcontentloaded",timeout=60000)
                assert response and response.status==200
                page.locator('main[data-design="'+theme+'"]').wait_for(state="visible",timeout=35000)
                page.get_by_text("김현지",exact=False).first.wait_for(timeout=25000)
                assert page.locator("[data-wedding-cover-photo]").count()>0
                assert page.locator("#wedding-gallery").count()>0
                assert page.locator("#wedding-info").count()>0
                assert page.locator("#wedding-location").count()>0
                result["passed"]=True
                print("3B_LIVE_THEME_OK",theme,flush=True)
            except Exception as e:
                result["passed"]=False
                result["error"]=type(e).__name__+": "+str(e)[:750]
                print("3B_LIVE_THEME_FAILED",theme,result["error"],flush=True)
            finally:
                records["themes"].append(result)
                ctx.close()
    finally:
        browser.close()

summary={
 "new_public_intro_styles":sum(x.get("passed",False) for x in records["intro"]),
 "intro_cases":len(records["intro"]),
 "public_wedding_themes":sum(x.get("passed",False) for x in records["themes"]),
 "theme_cases":len(records["themes"]),
 "cinema_photo_loaded":sum(x.get("photo_loaded_before_capture",False) for x in records["intro"] if x.get("style")=="cinema"),
}
records["summary"]=summary
(OUT/"manifest.json").write_text(json.dumps(records,ensure_ascii=False,indent=2)+"\n","utf8")
(OUT/"SUMMARY.md").write_text(
    "# Invitation 3-B live web verification\n\n"+
    "\n".join("- "+k+": "+str(v) for k,v in summary.items())+
    "\n\nThis confirms served public UI, not the Firebase console rollout commit or physical Android/iOS hardware.\n",
    "utf8"
)
print("3B_LIVE_SUMMARY",json.dumps(summary),flush=True)
if (summary["new_public_intro_styles"]!=6 or summary["public_wedding_themes"]!=5
        or summary["cinema_photo_loaded"]!=2):
    raise SystemExit("Deployment smoke did not meet both UI and live public-route criteria")
