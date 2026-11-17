#!/usr/bin/env python3
"""INTRO-GIF-03-D: isolated browser QA of 12 verified GIFs and five event scopes.

Uses development-only fixtures. Never authenticates as a real customer or writes Firestore.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get('INTRO_GIF_03D_BASE_URL', 'http://127.0.0.1:3000').rstrip('/')
OUT = Path('artifacts/intro-gif-03d')
OUT.mkdir(parents=True, exist_ok=True)
EVENTS = ['wedding', 'first-birthday', 'birthday', 'opening', 'general-event']
WIDTHS = [320, 390, 1440]
report = {'task': 'INTRO-GIF-03-D', 'checks': [], 'screenshots': [], 'production_writes': 0}


def screenshot(page, name):
    path = OUT / name
    page.screenshot(path=str(path), full_page=True, animations='disabled')
    report['screenshots'].append({
        'name': name, 'bytes': path.stat().st_size,
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    })


with sync_playwright() as browser_tool:
    browser = browser_tool.chromium.launch(headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage'])
    try:
        for width in WIDTHS:
            context = browser.new_context(viewport={'width': width, 'height': 860},
                locale='ko-KR', reduced_motion='no-preference')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)[:200]))
            requested_gif_urls = []
            page.on('request', lambda req: requested_gif_urls.append(req.url)
                if req.url.split('?')[0].endswith('.gif') else None)
            response = page.goto(BASE+'/intro-catalog-editor-qa/', wait_until='domcontentloaded',
                timeout=90000)
            assert response and response.status == 200, ('editor fixture', width)
            page.locator('[data-intro-editor-qa][data-ready="true"]').wait_for()
            for event in EVENTS:
                requested_gif_urls.clear()
                page.locator('[data-qa-event-type]').select_option(event)
                picker = page.locator('[data-intro-preset-editor]')
                eligible = 12 if event == 'wedding' else 6
                assert picker.locator('[data-intro-preset]').count() == eligible, (width, event)
                assert picker.locator('input[type="radio"]').count() == eligible+1
                assert picker.locator('[data-intro-preset="intro-12"]').count() == (
                    1 if event == 'wedding' else 0)
                assert picker.locator('[data-intro-group="luxury"]').count() == (
                    1 if event == 'wedding' else 0)
                assert picker.locator('[data-intro-group="character"]').count() == (
                    1 if event == 'wedding' else 0)
                assert not requested_gif_urls, ('GIF eager-loaded from poster gallery', width, event)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), (
                    width, event, 'overflow')
                screenshot(page, f'catalog-{event}-{width}.png')

                group = 'character' if event == 'wedding' else 'emotional'
                target = 'intro-10' if event == 'wedding' else 'intro-05'
                picker.locator(f'[data-intro-group="{group}"]').click()
                assert picker.locator('[data-intro-preset]').count() == 3
                assert picker.locator(f'[data-intro-preset="{target}"]').count() == 1
                picker.locator(f'[data-intro-preset="{target}"]').get_by_role(
                    'button', name='GIF 미리보기').click()
                dialog = page.locator('dialog[open]')
                dialog.wait_for()
                assert dialog.locator('img').get_attribute('src').endswith(target + '.gif')
                assert '저장값: 기존 설정' in page.locator('[data-qa-summary]').inner_text()
                page.keyboard.press('Escape')
                dialog.wait_for(state='hidden')

                picker.locator(f'input[value="{target}"]').check()
                assert f'미저장 선택: {target}' in page.locator('[data-qa-summary]').inner_text()
                page.locator('[data-qa-reset]').click()
                assert '미저장 선택: 미선택' in page.locator('[data-qa-summary]').inner_text()
                picker.locator(f'input[value="{target}"]').check()
                page.locator('[data-qa-save]').click()
                assert f'저장값: {target}' in page.locator('[data-qa-summary]').inner_text()
                picker.locator('input[value="none"]').check()
                assert f'저장값: {target}' in page.locator('[data-qa-summary]').inner_text(), (
                    'Draft none changed saved choice')
                page.locator('[data-qa-reset]').click()
                assert f'미저장 선택: {target}' in page.locator('[data-qa-summary]').inner_text()
                picker.locator('[data-intro-group="all"]').click()
                assert picker.locator('[data-intro-preset]').count() == eligible
                assert not errors, (width, event, errors)
                report['checks'].append({'width': width, 'event': event,
                    'eligible': eligible, 'save': target, 'passed': True})
            context.close()

        context = browser.new_context(viewport={'width':390,'height':844})
        page = context.new_page()
        response = page.goto(BASE+'/mobile-gif-intro-preview/?preset=intro-10&event=opening',
            wait_until='domcontentloaded')
        assert response and response.status == 404, 'Nonwedding preview of character must 404'
        response = page.goto(BASE+'/mobile-gif-intro-preview/?preset=intro-10&event=wedding',
            wait_until='domcontentloaded')
        assert response and response.status == 200
        page.locator('[data-intro-gif-preview]').wait_for()
        page.locator('img[src*="intro-10.gif"]').wait_for()
        response = page.goto(BASE+'/intro-public-qa/?event=opening&intro=intro-10&slug=qa-opening',
            wait_until='domcontentloaded')
        assert response and response.status == 200
        page.wait_for_timeout(120)
        assert page.locator('[data-public-invitation-gif-intro]').count() == 0
        response = page.goto(BASE+'/intro-public-qa/?event=opening&intro=intro-06&slug=qa-opening',
            wait_until='domcontentloaded')
        assert response and response.status == 200
        page.locator('[data-public-invitation-gif-intro="intro-06"]').wait_for()
        page.get_by_role('button',name='초대장 보기').click()
        assert page.locator('[data-public-invitation-gif-intro]').count()==0
        report['checks'].append({'case':'preview-404-and-public-event-boundary','passed':True})
        context.close()

        reduced = browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
        page = reduced.new_page()
        gif_urls=[]
        page.on('request', lambda req: gif_urls.append(req.url)
            if req.url.split('?')[0].endswith('.gif') else None)
        page.goto(BASE+'/mobile-gif-intro-preview/?preset=intro-12&event=wedding',
            wait_until='domcontentloaded')
        page.get_by_text('모션 감소 설정에 따라 정지 포스터만 표시합니다.').wait_for()
        page.locator('img[src*="intro-12.webp"]').wait_for()
        assert not gif_urls, 'Reduced-motion must not request 2s GIF'
        screenshot(page,'preview-reduced-motion-390.png')
        report['checks'].append({'case':'reduced-motion-poster-only','passed':True})
        reduced.close()
    finally:
        browser.close()

assert len(report['checks']) == 17 and all(c['passed'] for c in report['checks'])
(OUT/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',
    encoding='utf-8')
print('INTRO_GIF_03D_BROWSER_QA_OK',len(report['checks']),
    'screenshots',len(report['screenshots']),flush=True)
