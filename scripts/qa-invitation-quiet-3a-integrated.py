#!/usr/bin/env python3
"""3-A: real five wedding renderer themes + new Quiet Invitation intro in Chromium.

A local Next.js page receives a same-origin, unsaved synthetic wedding seed.
No live customer profile, Firebase writes, Kakao send, payment or deployment.
The live public five themes are checked in a SEPARATE read-only job.
This is browser/device EMULATION, not physical-device certification.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.getenv("INVITATION_3A_BASE_URL","http://127.0.0.1:3000").rstrip("/")
OUT=Path("artifacts/quiet-invitation-3a")
OUT.mkdir(parents=True,exist_ok=True)
SEED=json.loads(Path("artifacts/quiet-invitation-2b/local-preview-seed.json").read_text("utf8"))
THEMES=("simple","classic-r","romantic","gyeol","emotional")
STYLES=("light","cinema","envelope")
SIZES={"mobile390":(390,844,2,True),"desktop1440":(1440,900,1,False)}
WIDTHS=(320,360,390,430,600,840,1280,1440)
AXE=Path("artifacts/axe-core-4.10.3.min.js")
ISSUES=[]
REPORT={
    "title":"Invitation 3-A new Quiet Invitation overlay against real wedding renderer (local only)",
    "source":"local Next.js WizardPreviewClient with real WeddingBase, 5 themes / synthetic wedding information",
    "run_utc":datetime.now(timezone.utc).isoformat(),
    "styles":list(STYLES),"themes":list(THEMES),"widths":list(WIDTHS),
    "intro_cases":[],"responsive":[],"accessibility":[],"failures":ISSUES,
    "limitations":[
        "This checks actual React WeddingBase and WeddingIntro but local synthetic names; not a live Firebase customer page.",
        "The live public Firebase samples are checked separately, and do not yet contain the PR's new intro.",
        "Chromium mobile emulation and Android emulator do NOT substitute for a physical Android/iPhone/foldable.",
        "VoiceOver, TalkBack hardware announcements and real Kakao/Maps/Payments cannot be certified here."
    ],
}
def emit(msg):
    print(msg,flush=True)

def frame_from_parent(page,style,theme):
    page.goto(BASE+"/mobile-intro-preview/?style=none",wait_until="domcontentloaded",timeout=90000)
    page.evaluate("""params => {
      const initial=structuredClone(params.seed);
      initial.introStyle='none';
      initial.pageData={...initial.pageData,
        weddingCover:{focusX:17,focusY:80,textPosition:'below'}};
      const sample={...initial,introStyle:params.style};
      const iframe=document.createElement('iframe');
      iframe.id='qa-3a-iframe';
      Object.assign(iframe.style,{
        position:'fixed',inset:'0',width:'100vw',height:'100dvh',
        border:'0',zIndex:'5000',background:'#faf9f6'
      });
      window.__qa3a={ready:0,rendered:0,theme:params.theme,style:params.style,
        sample,original:initial,top:0,errors:[]};
      window.addEventListener('message',event=>{
        if(event.origin!==location.origin || event.source!==iframe.contentWindow)return;
        const state=window.__qa3a;
        if(event.data?.type==='wedding-wizard-preview:ready'){
          state.ready++;
          iframe.contentWindow.postMessage({
            type:'wedding-wizard-preview:update',
            formState:state.sample,theme:state.theme
          },location.origin);
        }
        if(event.data?.type==='wedding-wizard-preview:rendered'){
          state.rendered++;
          if(state.top>0)return;
          iframe.contentWindow.postMessage({type:'wedding-wizard-preview:top'},location.origin);
          state.top++;
        }
      });
      iframe.src='/wizard-preview/';
      document.body.append(iframe);
    }""",{"seed":SEED,"style":style,"theme":theme})
    page.wait_for_function("window.__qa3a?.rendered>0",timeout=40000)
    element=page.locator("#qa-3a-iframe").element_handle()
    frame=element.content_frame() if element else None
    assert frame, "Missing same-origin QA iframe"
    frame.locator('main[data-design="'+theme+'"]').wait_for(state="visible",timeout=20000)
    return frame

def read_state(frame):
    return frame.evaluate("""() => {
      const cover=document.querySelector('[data-wedding-cover-photo]');
      const photo=document.querySelector('[data-intro-photo]');
      const root=document.querySelector('main[data-design]');
      const intro=document.querySelector('[data-wedding-intro]');
      const pending=document.querySelector('[data-wedding-intro-pending]');
      const stage=intro?.querySelector('[data-style]');
      const skip=intro?.querySelector('[data-skip]');
      const size=(node)=>{
        if(!node)return null;
        const r=node.getBoundingClientRect();
        return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};
      };
      return {
        theme:root?.dataset.design ?? null,
        documentWidth:document.documentElement.scrollWidth,
        innerWidth:innerWidth,
        htmlOverflow:document.documentElement.scrollWidth>innerWidth+1,
        coverFound:!!cover,coverLoaded:cover?.complete&&cover.naturalWidth>0,
        coverObjectPosition:cover?getComputedStyle(cover).objectPosition:null,
        coverVisibility:cover?.style.visibility??null,
        introVisible:!!intro,pendingVisible:!!pending,
        introObjectPosition:photo?getComputedStyle(photo).objectPosition:null,
        introPhotoLoaded:photo?.complete&&photo.naturalWidth>0,
        introStage:size(stage),coverRect:size(cover),
        skipRect:size(skip),
        scrollLocked:document.body.style.overflow==='hidden',
        focusInside:!!(intro && intro.contains(document.activeElement)),
        mainText:root?.innerText.slice(0,240) ?? '',
      };
    }""")

def write_screen(page,stem,case):
    path=OUT/(stem+".png")
    page.screenshot(path=str(path),animations="disabled",timeout=45000)
    data=path.read_bytes()
    case.setdefault("screenshots",[]).append({
        "file":path.name,"sha256":hashlib.sha256(data).hexdigest(),
        "bytes":len(data),
    })
    emit("3A_SCREEN "+path.name+" "+str(len(data)))

def scan_axe(frame,theme,style,stage,width):
    if not AXE.is_file():raise AssertionError("Pinned axe-core file is missing")
    frame.add_script_tag(content=AXE.read_text("utf8"))
    result=frame.evaluate("""async()=>{
      if(!window.axe)throw Error('axe unavailable');
      const r=await window.axe.run(document,{
        runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}
      });
      return {violations:r.violations.map(v=>({
        id:v.id,impact:v.impact,nodes:v.nodes.length,
        paths:v.nodes.slice(0,3).map(n=>n.target)
      })),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.length})),
      passes:r.passes.length};
    }""")
    item={"theme":theme,"style":style,"stage":stage,"width":width,**result}
    REPORT["accessibility"].append(item)
    if result["violations"]:
        ISSUES.append("AXE "+theme+"/"+style+"/"+stage+"/"+str(width)+": "+json.dumps(result["violations"],ensure_ascii=False))
    return item

def assert_clean_handoff(frame,theme,case):
    frame.locator('[data-wedding-intro-pending]').wait_for(state="detached",timeout=6000)
    frame.locator('[data-wedding-intro]').wait_for(state="detached",timeout=6500)
    frame.wait_for_timeout(120)
    end=read_state(frame)
    case["after_handoff"]=end
    assert not end["introVisible"] and not end["pendingVisible"],"Intro leaked"
    assert end["theme"]==theme
    assert end["coverFound"] and end["coverLoaded"],"Final cover missing or failed"
    assert end["coverVisibility"]!="hidden","Cover must never remain hidden"
    assert not end["scrollLocked"],"Scroll lock leaked"
    assert not end["htmlOverflow"],"Horizontal overflow"
    assert "테스트신랑" in end["mainText"] or frame.locator("main[data-design]").inner_text().find("테스트신랑")>=0

def intro_case(browser,theme,style,view,config):
    width,height,scale,mobile=config
    context=browser.new_context(
        viewport={"width":width,"height":height},
        device_scale_factor=scale,is_mobile=mobile,has_touch=mobile,
        locale="ko-KR",color_scheme="light",reduced_motion="no-preference",
        bypass_csp=True
    )
    page=context.new_page()
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)[:350]))
    case={"theme":theme,"style":style,"viewport":view,"passed":False}
    try:
        frame=frame_from_parent(page,style,theme)
        intro=frame.locator('[data-wedding-intro="'+style+'"]')
        intro.wait_for(state="visible",timeout=7000)
        frame.wait_for_timeout(125)
        start=read_state(frame)
        assert start["theme"]==theme
        assert start["introStage"]["w"]<=min(width,480)+1,start
        assert start["skipRect"]["w"]>=48 and start["skipRect"]["h"]>=48
        assert not start["htmlOverflow"]
        assert start["coverFound"] and start["coverLoaded"]
        case["before_handoff"]=start
        if style=="cinema":
            assert start["introPhotoLoaded"],"Intro image not available"
            assert start["coverObjectPosition"]==start["introObjectPosition"],"Cover image focus mismatch"
        if style=="envelope":
            frame.locator("[data-letter-open]").wait_for(state="visible",timeout=5000)
            frame.wait_for_timeout(350)
            assert intro.is_visible(),"Envelope should wait for tap"
            write_screen(page,view+"-"+theme+"-"+style+"-before-tap",case)
            scan_axe(frame,theme,style,"intro",width)
            # The intro must survive resizing; only changing the viewport should not trigger complete.
            page.set_viewport_size({"width":width-12,"height":height})
            frame.wait_for_timeout(120)
            assert intro.is_visible(),"Resize unexpectedly dismissed envelope"
            frame.locator("[data-letter-open]").click(timeout=7000)
        else:
            frame.wait_for_function("""() => {
              const copy=document.querySelector('[data-intro-copy]');
              return !!copy&&Number.parseFloat(getComputedStyle(copy).opacity)>0.9;
            }""",timeout=5000)
            write_screen(page,view+"-"+theme+"-"+style+"-reading",case)
            scan_axe(frame,theme,style,"intro",width)
            page.set_viewport_size({"width":width-12,"height":height})
            frame.wait_for_timeout(100)
            assert intro.is_visible(),"Resize unexpectedly dismissed auto intro"
        assert_clean_handoff(frame,theme,case)
        write_screen(page,view+"-"+theme+"-"+style+"-cover",case)
        if style=="envelope":
            scan_axe(frame,theme,style,"cover",width)
        assert not errors,errors
        case["passed"]=True
        emit("3A_INTRO_OK "+view+" "+theme+" "+style)
    except Exception as e:
        case["error"]=type(e).__name__+": "+str(e)[:1000]
        ISSUES.append("3A_INTRO_FAILED "+view+"/"+theme+"/"+style+": "+case["error"])
        emit("3A_INTRO_FAIL "+view+" "+theme+" "+style+" "+case["error"][:250])
    finally:
        REPORT["intro_cases"].append(case)
        context.close()

def responsive_case(browser,theme):
    context=browser.new_context(
        viewport={"width":390,"height":844},device_scale_factor=1,
        locale="ko-KR",color_scheme="light",reduced_motion="reduce"
    )
    page=context.new_page()
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)[:350]))
    try:
        frame=frame_from_parent(page,"light",theme)
        frame.locator('[data-wedding-intro]').wait_for(state="detached",timeout=9000)
        for width in WIDTHS:
            page.set_viewport_size({"width":width,"height":844 if width<=430 else 900})
            frame.wait_for_timeout(120)
            state=read_state(frame)
            controls=frame.evaluate("""() => {
              const nodes=[...document.querySelectorAll('main[data-design] button,main[data-design] a,main[data-design] summary')];
              return nodes.filter(el=>{
                const r=el.getBoundingClientRect(),s=getComputedStyle(el);
                if(!r.width||!r.height||s.display==='none'||s.visibility==='hidden')return false;
                if(r.left<0||r.right>innerWidth)return false;
                return r.width<43.5||r.height<43.5;
              }).slice(0,8).map(el=>({name:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,50),
                size:[Math.round(el.getBoundingClientRect().width),Math.round(el.getBoundingClientRect().height)]}));
            }""")
            check={"theme":theme,"width":width,"coverLoaded":state["coverLoaded"],
                   "horizontalOverflow":state["htmlOverflow"],
                   "smallTargets":controls,"passed":True}
            if state["htmlOverflow"] or not state["coverLoaded"]:
                check["passed"]=False
                ISSUES.append("3A_LAYOUT_"+theme+"_"+str(width)+" "+json.dumps(check,ensure_ascii=False))
            if controls:
                # Existing public wedding layout may have smaller controls; report precisely instead of hiding failures.
                check["passed"]=False
                ISSUES.append("3A_TOUCH_TARGET_"+theme+"_"+str(width)+" "+json.dumps(controls,ensure_ascii=False))
            REPORT["responsive"].append(check)
            if width in (320,390,600,840,1440):
                shotcase={"screenshots":[]}
                write_screen(page,"responsive-"+theme+"-"+str(width),shotcase)
                check["screenshots"]=shotcase["screenshots"]
            if width in (390,1440):
                scan_axe(frame,theme,"none","cover",width)
        assert not errors,errors
    except Exception as e:
        ISSUES.append("3A_RESPONSIVE_FAILED "+theme+": "+type(e).__name__+" "+str(e)[:750])
    finally:
        context.close()

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    try:
        for view,cfg in SIZES.items():
            for theme in THEMES:
                for style in STYLES:
                    intro_case(browser,theme,style,view,cfg)
        for theme in THEMES:
            responsive_case(browser,theme)
    finally:
        browser.close()

summary={
    "intro_passed":sum(c["passed"] for c in REPORT["intro_cases"]),
    "intro_total":len(REPORT["intro_cases"]),
    "responsive_passed":sum(c["passed"] for c in REPORT["responsive"]),
    "responsive_total":len(REPORT["responsive"]),
    "accessibility_scans":len(REPORT["accessibility"]),
    "accessibility_violations":sum(len(c["violations"]) for c in REPORT["accessibility"]),
    "issues":len(ISSUES)
}
REPORT["summary"]=summary
(OUT/"manifest.json").write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+"\n","utf8")
(OUT/"SUMMARY.md").write_text(
    "# Invitation 3-A local new-intro / five wedding-theme QA\n\n"+
    "\n".join("- "+str(k)+": "+str(v) for k,v in summary.items())+
    "\n\nNot physical-device QA and not a deployed Firebase intro test. " +
    "Live public samples checked by a separate read-only workflow.\n" +
    ("\n".join("* "+i for i in ISSUES[:80]) if ISSUES else "No detected blockers.")+"\n",
    "utf8"
)
emit("3A_LOCAL_SUMMARY "+json.dumps(summary,ensure_ascii=False))
if summary["intro_passed"]!=30 or summary["responsive_passed"]!=40 or summary["accessibility_violations"] or ISSUES:
    raise SystemExit("3-A local integrated QA has findings; inspect manifest and fix before release.")
