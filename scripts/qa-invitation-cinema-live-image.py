#!/usr/bin/env python3
"""Read-only diagnostic for cinema preview image on deployed Invitation.

Does NOT alter production storage or customer content. Reports whether the
sample image loads before the 1.6-second intro finishes, and whether the image
URL actually responds. Only the public, repository-provided sample is tested.
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

from playwright.sync_api import sync_playwright

BASE=os.environ.get("INVITATION_PUBLIC_BASE","https://invite.msgnote.kr").rstrip("/")
OUT=Path("artifacts/cinema-photo-live-diagnostic")
OUT.mkdir(parents=True,exist_ok=True)
VIEWPORTS={
    "mobile390":dict(viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True,has_touch=True),
    "desktop1440":dict(viewport={"width":1440,"height":900},device_scale_factor=1,is_mobile=False,has_touch=False),
}
REPORT={"date_utc":datetime.now(timezone.utc).isoformat(),"origin":BASE,
        "uses_public_sample_only":True,"cases":[],"public_asset":{}}

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    try:
        ctx=browser.new_context(locale="ko-KR")
        page=ctx.new_page()
        asset_url=urljoin(BASE+"/","/images/home-wedding/portrait.webp")
        try:
            response=page.request.get(asset_url,timeout=20000)
            header=response.headers.get("content-type","")
            body=response.body()
            REPORT["public_asset"]={
                "path":urlparse(asset_url).path,"http_status":response.status,
                "content_type":header,"bytes":len(body),
                "first_12_bytes_hex":body[:12].hex(),
            }
        except Exception as error:
            REPORT["public_asset"]={"path":urlparse(asset_url).path,"failure":str(error)[:280]}
        ctx.close()
        for name,settings in VIEWPORTS.items():
            ctx=browser.new_context(**settings,locale="ko-KR",reduced_motion="no-preference")
            page=ctx.new_page()
            errors=[];network=[];images=[]
            page.on("pageerror",lambda error:errors.append(str(error)[:240]))
            page.on("requestfailed",lambda req:network.append({"type":req.resource_type,"path":urlparse(req.url).path,"failure":req.failure}))
            page.on("response",lambda r:images.append({"status":r.status,"path":urlparse(r.url).path,"mime":r.headers.get("content-type","")}) if (r.request.resource_type=="image" or "/images/home-wedding/" in r.url) else None)
            record={"viewport":name,"url":BASE+"/mobile-intro-preview/?style=cinema"}
            try:
                res=page.goto(record["url"],wait_until="domcontentloaded",timeout=50000)
                record["http_status"]=res.status if res else None
                page.locator('[data-wedding-intro="cinema"]').wait_for(state="visible",timeout=12000)
                def metrics():
                    return page.evaluate("""() => {
                        const photo=document.querySelector('[data-intro-photo]');
                        const stage=document.querySelector('[data-wedding-intro]');
                        const shade=stage?.querySelector('[class*="photoShade"]');
                        const computed=photo?getComputedStyle(photo):null;
                        const rect=photo?.getBoundingClientRect();
                        return {
                          stageVisible: !!stage,
                          imageExists: !!photo,
                          srcPath: photo?new URL(photo.currentSrc||photo.src).pathname:null,
                          imageComplete:photo?.complete??false,
                          imageNaturalWidth:photo?.naturalWidth??0,
                          imageNaturalHeight:photo?.naturalHeight??0,
                          hiddenAttribute:photo?.hidden??null,
                          display:computed?.display??null,
                          visibility:computed?.visibility??null,
                          opacity:computed?.opacity??null,
                          zIndex:computed?.zIndex??null,
                          objectFit:computed?.objectFit??null,
                          rect:rect?{width:Math.round(rect.width),height:Math.round(rect.height)}:null,
                          shadeExists:!!shade,
                          textOpacity:getComputedStyle(document.querySelector('[data-intro-copy]')).opacity
                        };
                    }""")
                record["initial"]=metrics()
                page.screenshot(path=str(OUT/(name+"-first.png")),timeout=20000)
                try:
                    page.wait_for_function("""() => {
                      const i=document.querySelector('[data-intro-photo]');
                      return !i || i.complete;
                    }""",timeout=5000)
                except Exception:
                    pass
                record["after_image_settle"]=metrics()
                if record["after_image_settle"].get("stageVisible"):
                    page.screenshot(path=str(OUT/(name+"-settled.png")),timeout=20000)
                record["image_requests"]=images
                record["failed_requests"]=network
                record["page_errors"]=errors
                record["image_loaded_before_close"]=record["after_image_settle"].get("imageNaturalWidth",0)>0
                print("CINEMA_DIAGNOSTIC",name,json.dumps(record,ensure_ascii=False),flush=True)
            except Exception as error:
                record["exception"]=type(error).__name__+": "+str(error)[:500]
                print("CINEMA_DIAGNOSTIC_FAILURE",name,record["exception"],flush=True)
            finally:
                REPORT["cases"].append(record)
                ctx.close()
    finally:
        browser.close()
REPORT["summary"]={
    "cases_with_image_loaded":sum(bool(x.get("image_loaded_before_close")) for x in REPORT["cases"]),
    "total_cases":len(REPORT["cases"]),
    "public_sample_image_status":REPORT["public_asset"].get("http_status"),
}
(OUT/"manifest.json").write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
(OUT/"SUMMARY.md").write_text("# Invitation cinema live image diagnostic\n\n"+
    json.dumps(REPORT["summary"],ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print("CINEMA_DIAGNOSTIC_SUMMARY",json.dumps(REPORT["summary"]),flush=True)
# Diagnostic explicitly exits success even if issue reproduced; analyze the evidence.
