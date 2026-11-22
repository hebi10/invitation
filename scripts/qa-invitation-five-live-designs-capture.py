#!/usr/bin/env python3
"""2026-11-10: read-only capture of five CURRENT deployed public wedding designs.

Capture actual pages (not design concepts or mocked React screens) at real public
test sample URLs. Do not submit forms, change Firestore, send Kakao messages, or
change any public app or customer's data.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps
from playwright.sync_api import sync_playwright, TimeoutError as BrowserTimeout

OUTPUT=Path("artifacts/invitation-current-five-themes-20261110")
OUTPUT.mkdir(parents=True,exist_ok=True)
BASE=os.getenv("INVITATION_CAPTURE_BASE_URL","https://invite.msgnote.kr/shin-minje-kim-hyunji").rstrip("/")
THEMES=[
    ("simple","기본형"),
    ("classic-r","모던형"),
    ("romantic","포토형"),
    ("gyeol","클래식형"),
    ("emotional","내추럴형"),
]
SCREEN_SIZES=[
    ("mobile320",320,740),
    ("mobile390",390,844),
    ("mobile430",430,932),
    ("tablet840",840,1100),
    ("desktop1440",1440,900),
]
REPORT={
    "source":"Current live public Firebase App Hosting test invitation",
    "source_url_base":BASE,
    "capture_utc":datetime.now(timezone.utc).isoformat(),
    "sample_couple_only":True,
    "head_commit_declared":"4f09b9c98b58ea12b4c4f4d4af0990f819a712d4",
    "does_not_verify_apphosting_internal_rollout_sha":True,
    "themes":[],
    "screenshots":[],
    "issues":[],
    "notes":[
        "Five public sample weddings only; not authenticated customer data.",
        "Desktop and mobile are Chromium viewport emulations, not physical device images.",
        "Reduced-motion browser is used to capture stable content; animate-on first entrance is not recorded.",
        "Comparison to design must distinguish selection UI mockups from actual guest-facing wedding pages.",
    ],
}

def safe_text(s):
    return re.sub(r"\s+"," ",s or "").strip()[:120]

def append_screenshot(page,name,full_page=False):
    target=OUTPUT/name
    page.screenshot(path=str(target),full_page=full_page,animations="disabled",timeout=70000)
    b=target.read_bytes()
    with Image.open(target) as img:
        dims=img.size
    item={"file":name,"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),
          "px_size":list(dims),"full_page":full_page}
    REPORT["screenshots"].append(item)
    print("CAPTURE",name,len(b),dims,flush=True)

def load_and_prepare(page,theme):
    url=BASE+"/"+theme+"/"
    response=page.goto(url,wait_until="domcontentloaded",timeout=60000)
    assert response and response.status==200, "HTTP response "+str(response.status if response else None)
    page.locator('main[data-design="'+theme+'"]').wait_for(state="visible",timeout=30000)
    page.get_by_text("김현지",exact=False).first.wait_for(timeout=30000)
    try:
        dialog=page.get_by_role("dialog",name="결혼식 초대장 인트로").first
        dialog.wait_for(state="visible",timeout=2600)
        if dialog.is_visible():
            page.get_by_role("button",name="건너뛰기").first.click(timeout=8000)
            dialog.wait_for(state="detached",timeout=8000)
    except BrowserTimeout:
        pass
    page.evaluate("document.fonts.ready")
    try:
        page.locator('button[aria-label^="음악 "]').first.wait_for(state="visible",timeout=10000)
    except BrowserTimeout:
        pass
    # Expose all lazy-loaded gallery and closing photos, without mutating
    # customer data. Do not interact with any forms.
    height=page.evaluate("document.documentElement.scrollHeight")
    for y in range(0,min(height,36000),650):
        page.evaluate("(y)=>scrollTo(0,y)",y)
        page.wait_for_timeout(60)
    page.wait_for_timeout(500)
    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    page.wait_for_timeout(300)
    return response.status

def inspect(page):
    return page.evaluate("""() => {
        const root=document.querySelector('main[data-design]');
        const r=root?.getBoundingClientRect();
        const sections=[
          ['cover','[data-wedding-cover-frame]'],
          ['invitation','[data-wedding-section="invitation"]'],
          ['gallery','#wedding-gallery'],
          ['ceremony','#wedding-info'],
          ['location','#wedding-location'],
          ['transport','[data-wedding-section="transport"]'],
          ['guestbook','[data-wedding-section="guestbook"]'],
          ['closing','[data-wedding-closing]'],
        ];
        const nav=[...document.querySelectorAll('nav[aria-label="청첩장 바로가기"] a')]
          .map(a=>({text:a.textContent?.trim().slice(0,30),href:a.getAttribute('href')}));
        return {
          width:window.innerWidth,documentWidth:document.documentElement.scrollWidth,
          fullHeight:document.documentElement.scrollHeight,
          rootWidth:Math.round(r?.width??0),rootLeft:Math.round(r?.left??0),
          background:root?getComputedStyle(root).backgroundColor:null,
          bodyBackground:getComputedStyle(document.body).backgroundColor,
          hasMusic:!!document.querySelector('button[aria-label^="음악 "]'),
          nav,
          sections:Object.fromEntries(sections.map(([id,selector])=>{
            const el=document.querySelector(selector);
            if(!el)return [id,null];
            const rect=el.getBoundingClientRect();
            const title=el.querySelector('h1,h2,h3');
            return [id,{top:Math.round(rect.top+window.scrollY),
              height:Math.round(rect.height),width:Math.round(rect.width),
              title:title?.textContent?.trim().slice(0,80)??null,
              background:getComputedStyle(el).backgroundColor}];
          })),
          images:[...document.images].map(img=>{
            const rect=img.getBoundingClientRect();
            return {path:(()=>{try{return new URL(img.currentSrc||img.src).pathname}catch{return 'invalid'}})(),
              loaded:img.complete&&img.naturalWidth>0,
              naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
              visible:rect.width>0&&rect.height>0,
              rect:{w:Math.round(rect.width),h:Math.round(rect.height)}
            }
          }).filter(x=>x.visible).slice(0,45),
          headings:[...document.querySelectorAll('main[data-design] h1,main[data-design] h2')]
            .map(h=>{const st=getComputedStyle(h);return {
              text:h.textContent?.trim().slice(0,80),family:st.fontFamily,
              fontSize:st.fontSize,lineHeight:st.lineHeight
            }}).slice(0,24),
          allButtons:[...document.querySelectorAll('main[data-design] button')]
            .map(b=>({label:b.getAttribute('aria-label')||b.textContent?.trim().slice(0,44),
              w:Math.round(b.getBoundingClientRect().width),
              h:Math.round(b.getBoundingClientRect().height)})).filter(x=>x.w>0&&x.h>0).slice(0,60)
        };
    }""")

def section_capture(page,theme,kind,selector):
    locator=page.locator(selector).first
    if not locator.count():return False
    try:
        locator.scroll_into_view_if_needed(timeout=8000)
        page.wait_for_timeout(300)
        if not locator.is_visible():return False
        box=locator.bounding_box()
        if not box or box["height"]>15000:return False
        path=f"{theme}-mobile390-{kind}.png"
        locator.screenshot(path=str(OUTPUT/path),animations="disabled",timeout=50000)
        b=(OUTPUT/path).read_bytes()
        REPORT["screenshots"].append({"file":path,"bytes":len(b),
            "sha256":hashlib.sha256(b).hexdigest(),"selector":selector,"section":kind})
        print("CAPTURE_SECTION",path,len(b),flush=True)
        return True
    except Exception as e:
        REPORT["issues"].append({"theme":theme,"section":kind,"error":str(e)[:280]})
        return False

def font(size):
    choices=[
      "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
      "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in choices:
        if Path(path).is_file():return ImageFont.truetype(path,size)
    return ImageFont.load_default()

def make_overview(source_suffix,file_name,title):
    W=270
    H=510
    canvas=Image.new("RGB",(5*W,580),"#f8f8f7")
    draw=ImageDraw.Draw(canvas)
    draw.text((16,12),title,font=font(24),fill="#282725")
    for idx,(theme,label) in enumerate(THEMES):
        raw=OUTPUT/f"{theme}-{source_suffix}.png"
        if not raw.exists():continue
        with Image.open(raw) as img:
            img=img.convert("RGB")
            thumb=ImageOps.contain(img,(W-14,H))
            # Align top of page instead of showing random below-fold sections.
            x=idx*W+(W-thumb.width)//2
            y=48
            canvas.paste(thumb,(x,y))
        draw.text((idx*W+12,552),label+" / "+theme,font=font(17),fill="#282725")
    target=OUTPUT/file_name
    canvas.save(target,quality=89,optimize=True)
    return target

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    try:
        for theme,label in THEMES:
            entry={"theme":theme,"label":label,"url":BASE+"/"+theme+"/","viewport_checks":[],
                   "pageErrors":[],"failedNetwork":[],"http_status":None}
            ctx=browser.new_context(viewport={"width":390,"height":844},device_scale_factor=2,
                is_mobile=True,has_touch=True,locale="ko-KR",reduced_motion="reduce",color_scheme="light")
            page=ctx.new_page()
            page.on("pageerror",lambda e:entry["pageErrors"].append(str(e)[:240]))
            page.on("requestfailed",lambda req:entry["failedNetwork"].append(
                {"path":req.url.split("?")[0][-100:],"type":req.resource_type,
                 "error":req.failure}) if req.resource_type in ("image","document") else None)
            try:
                entry["http_status"]=load_and_prepare(page,theme)
                entry["viewport_checks"].append({"width":390,**inspect(page)})
                append_screenshot(page,f"{theme}-mobile390-first.png")
                append_screenshot(page,f"{theme}-mobile390-full.png",full_page=True)
                for kind,selector in [
                    ("gallery","#wedding-gallery"),
                    ("ceremony","#wedding-info"),
                    ("guestbook",'[data-wedding-section="guestbook"]'),
                    ("closing",'[data-wedding-closing]'),
                ]:
                    section_capture(page,theme,kind,selector)
                for name,width,height in [
                    ("mobile320",320,740),
                    ("mobile430",430,932),
                    ("tablet840",840,1100),
                ]:
                    page.set_viewport_size({"width":width,"height":height})
                    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
                    page.wait_for_timeout(180)
                    entry["viewport_checks"].append({"width":width,**inspect(page)})
                    append_screenshot(page,f"{theme}-{name}-first.png")
            except Exception as e:
                entry["failure"]=type(e).__name__+": "+str(e)[:900]
                REPORT["issues"].append({"theme":theme,"kind":"mobile","error":entry["failure"]})
                print("FAIL_MOBILE",theme,entry["failure"],flush=True)
            finally:
                ctx.close()
            ctx=browser.new_context(viewport={"width":1440,"height":900},device_scale_factor=1,
                is_mobile=False,has_touch=False,locale="ko-KR",reduced_motion="reduce",color_scheme="light")
            page=ctx.new_page()
            try:
                load_and_prepare(page,theme)
                entry["viewport_checks"].append({"width":1440,**inspect(page)})
                append_screenshot(page,f"{theme}-desktop1440-first.png")
                append_screenshot(page,f"{theme}-desktop1440-full.png",full_page=True)
                print("LIVE_THEME_CAPTURE",theme,"views",len(entry["viewport_checks"]),flush=True)
            except Exception as e:
                entry["desktop_failure"]=type(e).__name__+": "+str(e)[:900]
                REPORT["issues"].append({"theme":theme,"kind":"desktop","error":entry["desktop_failure"]})
                print("FAIL_DESKTOP",theme,entry["desktop_failure"],flush=True)
            finally:
                ctx.close()
            REPORT["themes"].append(entry)
    finally:
        browser.close()

overview_files=[]
for suffix,name,title in [
    ("mobile390-first","OVERVIEW-five-themes-mobile390.jpg","INVITATION 5 THEMES / LIVE MOBILE 390 / 2026-11-10"),
    ("desktop1440-first","OVERVIEW-five-themes-desktop1440.jpg","INVITATION 5 THEMES / LIVE DESKTOP 1440 / 2026-11-10"),
    ("mobile390-gallery","OVERVIEW-five-themes-gallery.jpg","INVITATION 5 THEMES / LIVE PHOTO GALLERY"),
    ("mobile390-ceremony","OVERVIEW-five-themes-ceremony.jpg","INVITATION 5 THEMES / LIVE CEREMONY"),
]:
    overview_files.append(str(make_overview(suffix,name,title).name))

summary={
    "themes_checked":len(REPORT["themes"]),
    "themes_with_http_200":sum(x.get("http_status")==200 for x in REPORT["themes"]),
    "viewport_checks":sum(len(x["viewport_checks"]) for x in REPORT["themes"]),
    "screenshots":len(REPORT["screenshots"]),
    "issues":len(REPORT["issues"]),
    "full_page_pngs":sum(x["file"].endswith("-full.png") for x in REPORT["screenshots"]),
    "overviews":overview_files
}
REPORT["summary"]=summary
(OUTPUT/"manifest.json").write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
(OUTPUT/"SUMMARY.md").write_text(
    "# Invitation 최신 5종 실제 운영 화면 캡처\n\n"+
    "\n".join("- "+k+": "+str(v) for k,v in summary.items())+
    "\n\n2026-11-10 production public sample URLs; no Firestore writes. "
    "No physical device, no actual Kakao receiving, no live payment. "
    "A design comparison must consider separate source mockups.\n"+
    ("\n".join("- "+str(i) for i in REPORT["issues"]) if REPORT["issues"] else ""),
    encoding="utf8"
)
print("CURRENT_FIVE_THEMES_SUMMARY",json.dumps(summary,ensure_ascii=False),flush=True)
if summary["themes_with_http_200"]!=5 or summary["viewport_checks"]!=25 or summary["issues"]:
    raise SystemExit("At least one theme screenshot or viewport check failed; inspect manifest")
