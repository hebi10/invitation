#!/usr/bin/env python3
"""P0 public demo data integrity audit (read only).

Checks five *currently published* wedding theme routes. Reports public
display names, wedding date, venue and image identity consistently across
themes; flags old sample dates. Does not update customer/Firestore records,
Storage, contact details, guestbook, purchases or live pages.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

BASE=os.environ.get("INVITATION_PUBLIC_SAMPLE_BASE","https://invite.msgnote.kr/shin-minje-kim-hyunji").rstrip("/")
OUT=Path("artifacts/invitation-p0-sample-integrity")
OUT.mkdir(parents=True,exist_ok=True)
THEMES=("simple","classic-r","romantic","gyeol","emotional")
AS_OF=datetime.now(timezone.utc).date()
REPORT={
 "source":"Live public five-theme *demo*, not authenticated real customer",
 "created_utc":datetime.now(timezone.utc).isoformat(),
 "read_only":True,"forms_submitted":0,"storage_writes":0,
 "themes":[],"warnings":[],"failures":[],
 "notes":[
   "Different-looking people in gallery photographs require a human identity/rights check; image URL equality cannot prove the same couple.",
   "A stored public sample is served from the invitation backend, not from the source file whose filename contains shin-minje.",
   "Phone numbers, bank accounts and private asset download tokens are not included in this report.",
   "Past-dated sample pages are warnings, not a reason to modify production customer data."
 ]
}

def date_ymd(s):
    for pattern in (
        r"(?P<y>20\d{2})\s*[.\/-]\s*(?P<m>\d{1,2})\s*[.\/-]\s*(?P<d>\d{1,2})",
        r"(?P<y>20\d{2})\s*년\s*(?P<m>\d{1,2})\s*월\s*(?P<d>\d{1,2})\s*일",
    ):
        m=re.search(pattern,s)
        if m:
            try:return f"{int(m.group('y')):04d}-{int(m.group('m')):02d}-{int(m.group('d')):02d}"
            except ValueError:pass
    return None

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    try:
        for theme in THEMES:
            context=browser.new_context(viewport={"width":390,"height":844},device_scale_factor=1,
                                        locale="ko-KR",reduced_motion="reduce")
            page=context.new_page()
            record={"theme":theme,"public_url":BASE+"/"+theme+"/"}
            try:
                response=page.goto(record["public_url"],wait_until="domcontentloaded",timeout=60000)
                if not response or response.status!=200:raise RuntimeError("Public sample did not return HTTP 200")
                root=page.locator("main[data-design='"+theme+"']")
                root.wait_for(state="visible",timeout=25000)
                page.get_by_text("김현지",exact=False).first.wait_for(timeout=25000)
                raw=page.evaluate("""() => {
                  const page=document.querySelector('main[data-design]');
                  const cover=document.querySelector('[data-wedding-cover-details]');
                  const image=document.querySelector('[data-wedding-cover-photo]');
                  const h1=document.querySelector('[id="wedding-cover-title"]');
                  const gallery=document.getElementById('wedding-gallery');
                  const text=cover?.innerText||'';
                  const ceremony=document.getElementById('wedding-info')?.innerText||'';
                  const venue=cover?.querySelector('[class*="venue"]')?.innerText||'';
                  const media=[...gallery?.querySelectorAll('img')||[]].map(img=>{
                    try{return new URL(img.currentSrc||img.src).pathname}catch{return null}
                  }).filter(Boolean);
                  return {
                    title:h1?.innerText||'',
                    coverText:text,
                    venue:venue,
                    ceremonyText:ceremony.slice(0,450),
                    coverImagePath:image?new URL(image.currentSrc||image.src).pathname:null,
                    galleryImagePaths: [...new Set(media)].slice(0,24),
                    galleryText:gallery?.innerText?.slice(0,220)||'',
                    mainWidth:page?.getBoundingClientRect().width||0,
                    renderedTheme:page?.getAttribute('data-design')||null,
                    hasCallButtons:!!document.querySelector('a[href^="tel:"]')
                  };
                }""")
                record["http_status"]=response.status
                record["names"]=re.sub(r"\s+"," ",raw["title"]).strip()
                record["date"]=date_ymd(raw["coverText"]) or date_ymd(raw["ceremonyText"])
                record["venue"]=re.sub(r"\s+"," ",raw["venue"]).strip()
                record["cover_image_path"]=raw["coverImagePath"]
                record["gallery_unique_loaded_urls"]=len(raw["galleryImagePaths"])
                record["gallery_image_identity_sample"]=raw["galleryImagePaths"][:6]
                record["theme_matches"]=raw["renderedTheme"]==theme
                record["has_contact_option"]=raw["hasCallButtons"]
                record["has_photo"]=bool(raw["coverImagePath"])
                if record["date"]:
                    record["date_in_past"]=datetime.fromisoformat(record["date"]).date()<AS_OF
                else:
                    REPORT["warnings"].append(theme+": displayed wedding date could not be normalized")
                if not record["names"]:
                    REPORT["failures"].append(theme+": couple name heading not found")
                if not record["theme_matches"] or not record["has_photo"]:
                    REPORT["failures"].append(theme+": theme or photo missing")
                print("P0_AUDIT",theme,json.dumps({
                    "names":record["names"],"date":record["date"],"venue":record["venue"],
                    "gallery_urls":record["gallery_unique_loaded_urls"],"date_in_past":record.get("date_in_past")
                },ensure_ascii=False),flush=True)
            except Exception as exc:
                record["error"]=type(exc).__name__+": "+str(exc)[:450]
                REPORT["failures"].append(theme+": "+record["error"])
            finally:
                REPORT["themes"].append(record)
                context.close()
    finally:
        browser.close()

names={x.get("names") for x in REPORT["themes"] if x.get("names")}
dates={x.get("date") for x in REPORT["themes"] if x.get("date")}
venues={x.get("venue") for x in REPORT["themes"] if x.get("venue")}
photos={x.get("cover_image_path") for x in REPORT["themes"] if x.get("cover_image_path")}
if len(names)>1:REPORT["failures"].append("The five themes disagree on couple names")
if len(dates)>1:REPORT["failures"].append("The five themes disagree on wedding date")
if len(venues)>1:REPORT["failures"].append("The five themes disagree on venue")
if len(photos)>1:REPORT["failures"].append("The five themes use different cover images")
if any(x.get("date_in_past") for x in REPORT["themes"]):
    REPORT["warnings"].append("Demo wedding date has already passed as of audit. Owner must approve demo-only data update.")
REPORT["warnings"].append("Manual check needed: gallery may include photographs of different couples; cannot prove people match through URL comparison.")
REPORT["summary"]={
    "public_themes":len(REPORT["themes"]),
    "consistent_names":len(names)==1,
    "consistent_dates":len(dates)==1,
    "consistent_venues":len(venues)==1,
    "consistent_cover_image":len(photos)==1,
    "past_date_warning":any(x.get("date_in_past") for x in REPORT["themes"]),
    "warnings":len(REPORT["warnings"]),
    "blocking_failures":len(REPORT["failures"]),
}
(OUT/"manifest.json").write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+"\n","utf8")
(OUT/"SUMMARY.md").write_text(
    "# Invitation P0 — 다섯 공개 테마의 샘플 데이터 정합성 (읽기 전용)\n\n"+
    "\n".join("- "+key+": "+str(value) for key,value in REPORT["summary"].items())+
    "\n\n## 주의·검토 사항\n"+
    "\n".join("- "+msg for msg in REPORT["warnings"]+REPORT["failures"])+"\n"+
    "\n고객 원본·Firebase/Storage·결제 및 전화/계좌 정보를 수정하거나 제출하지 않았습니다.\n",
    "utf8"
)
print("P0_PUBLIC_SAMPLE_SUMMARY",json.dumps(REPORT["summary"],ensure_ascii=False),flush=True)
if REPORT["failures"] or len(REPORT["themes"])!=5:raise SystemExit("P0 public sample cross-theme integrity error")
