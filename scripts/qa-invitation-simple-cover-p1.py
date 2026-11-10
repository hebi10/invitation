#!/usr/bin/env python3
"""P1 actual Next.js simple-only cover QA on separate local sample.

No Firebase write credentials. Uses the already-existing fictional 2027
homepage sample and the real WeddingBase/WeddingCover components; keeps
modern/romantic/gyeol/emotional and production guest records untouched.
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE=os.environ.get("INVITATION_LOCAL_BASE","http://127.0.0.1:3000").rstrip("/")
OUT=Path("artifacts/invitation-p1-simple-cover")
OUT.mkdir(parents=True,exist_ok=True)
SIZES={"mobile320":(320,740,2),"mobile390":(390,844,2),"mobile430":(430,932,2),"desktop1440":(1440,900,1)}
data={
    "source":"Local Next.js /sample-invitation, public fictional sample only",
    "production_firebase_writes":0,
    "rendered_at_utc":datetime.now(timezone.utc).isoformat(),
    "cases":[],
}
def screenshot(page,name,full=False):
    dest=OUT/name
    page.screenshot(path=str(dest),full_page=full,animations="disabled",timeout=60000)
    blob=dest.read_bytes()
    return {"file":name,"bytes":len(blob),"sha256":hashlib.sha256(blob).hexdigest()}

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    try:
        for name,(width,height,scale) in SIZES.items():
            ctx=browser.new_context(viewport={"width":width,"height":height},device_scale_factor=scale,
                                    locale="ko-KR",reduced_motion="reduce",color_scheme="light")
            page=ctx.new_page()
            errors=[];page.on("pageerror",lambda error:errors.append(str(error)[:350]))
            row={"viewport":name,"size_css":[width,height],"passed":False}
            try:
                response=page.goto(BASE+"/sample-invitation/",wait_until="domcontentloaded",timeout=90000)
                assert response and response.status==200
                page.locator('main[data-design="simple"]').wait_for(state="visible",timeout=35000)
                page.get_by_text("이서준",exact=False).first.wait_for(timeout=12000)
                page.evaluate("document.fonts.ready")
                page.wait_for_function("""() => {
                  const p=document.querySelector('[data-wedding-cover-photo]');
                  return !!p && p.complete && p.naturalWidth>0
                }""",timeout=30000)
                row["metrics"]=page.evaluate("""() => {
                    const main=document.querySelector('main[data-design="simple"]');
                    const cover=document.querySelector('section[aria-labelledby="wedding-cover-title"]');
                    const frame=document.querySelector('[data-wedding-cover-frame]');
                    const heading=document.getElementById('wedding-cover-title');
                    const photo=document.querySelector('[data-wedding-cover-photo]');
                    const mr=main?.getBoundingClientRect(),fr=frame?.getBoundingClientRect(),cr=cover?.getBoundingClientRect();
                    return {
                      renderedTheme:main?.dataset.design,
                      mainWidth:Math.round(mr?.width||0),
                      coverWidth:cr?.width||0,
                      photoWidth:fr?.width||0,
                      photoHeight:fr?.height||0,
                      photoWidthPercent:fr&&cr?fr.width/cr.width*100:null,
                      photoRatio:fr?fr.width/fr.height:null,
                      headingSize:heading?parseFloat(getComputedStyle(heading).fontSize):null,
                      headingFont:heading?getComputedStyle(heading).fontFamily:null,
                      headingText:heading?.textContent?.trim(),
                      coverColor:cover?getComputedStyle(cover).backgroundColor:null,
                      mainColor:main?getComputedStyle(main).backgroundColor:null,
                      loaded:!!(photo?.complete&&photo.naturalWidth>0),
                      horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
                      dateVisible:main?.innerText.includes('2027년 4월 17일')
                    };
                }""")
                metrics=row["metrics"]
                assert metrics["renderedTheme"]=="simple"
                assert not metrics["horizontalOverflow"]
                assert metrics["loaded"] and metrics["dateVisible"]
                assert metrics["coverColor"]=="rgb(250, 249, 246)",metrics
                assert abs(metrics["photoWidthPercent"]-92)<0.6,metrics
                assert abs(metrics["photoRatio"]-0.75)<0.015,metrics
                assert metrics["headingSize"]==(24 if width<=359 else 26),metrics
                assert "Wedding Myeongjo" in metrics["headingFont"],metrics
                assert "이서준" in metrics["headingText"] and "김하은" in metrics["headingText"]
                if errors:raise RuntimeError("React browser JS errors: "+str(errors))
                row["capture"]=screenshot(page,name+"-cover.png")
                if width in (390,1440):
                    row["full_page"]=screenshot(page,name+"-full.png",full=True)
                row["passed"]=True
                print("P1_SIMPLE_COVER_OK",name,json.dumps(metrics,ensure_ascii=False),flush=True)
            except Exception as e:
                row["failure"]=type(e).__name__+": "+str(e)[:1200]
                print("P1_SIMPLE_COVER_FAIL",name,row["failure"],flush=True)
            finally:
                data["cases"].append(row)
                ctx.close()
    finally: browser.close()
data["summary"]={"passed":sum(x["passed"] for x in data["cases"]),
                 "total":len(data["cases"]),
                 "photos_92pct_3to4":sum(bool(x["passed"]) for x in data["cases"])}
(OUT/"manifest.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n","utf8")
(OUT/"SUMMARY.md").write_text(
    "# Invitation P1 기본형 표지 · 실제 React/CSS QA\n\n"+
    "\n".join("- "+str(k)+": "+str(v) for k,v in data["summary"].items())+
    "\n\n기존 저장소의 가상 인물 2027년 예식을 사용한 로컬 Next.js 실제 컴포넌트 캡처입니다. "
    "운영 신민제·김현지 청첩장과 다른 사진이므로 얼굴·구도 1:1 비교용 자료가 아닙니다. "
    "고객 Firebase/결제/공개 URL 변경 0건.\n",
    "utf8")
print("P1_SIMPLE_COVER_SUMMARY",json.dumps(data["summary"],ensure_ascii=False))
if data["summary"]["passed"]!=4:raise SystemExit("P1 simple cover browser verification failure")
