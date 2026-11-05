#!/usr/bin/env python3
"""실계정 없이 Expo Go의 실제 Android 화면을 검증하고 캡처한다."""

import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import tempfile
import threading
import time
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/mobile-android'
APP = ROOT / 'apps/mobile'
ROUTE = APP / 'src/app/design-check.tsx'
FIXTURE = ROOT / 'scripts/fixtures/mobile-editor-capture.tsx.fixture'
MODALS_ROUTE = APP / 'src/app/design-check-modals.tsx'
MODALS_FIXTURE = ROOT / 'scripts/fixtures/mobile-modals-capture.tsx.fixture'
ACCOUNT_ROUTE = APP / 'src/app/design-check-accounts.tsx'
ACCOUNT_FIXTURE = ROOT / 'scripts/fixtures/mobile-owned-list-capture.tsx.fixture'
LINKED_ROUTE = APP / 'src/app/design-check-linked.tsx'
LINKED_FIXTURE = ROOT / 'scripts/fixtures/mobile-linked-list-capture.tsx.fixture'
APK_URL = 'https://github.com/expo/expo-go-releases/releases/download/Expo-Go-55.0.7/Expo-Go-55.0.7.apk'
APK_SIZE = 195851103
APK_SHA256 = '6368eec8973ebb011c6f4f9d32afebe3fc64dd3125f2c0b529767e88dccf64ab'
PACKAGE = 'host.exp.exponent'
PORT = 8092
TOOLS_BUTTON_DISABLED = False
VERIFIED = {'environment': 'Android API 35 / Expo Go 55.0.7',
            'uses_live_account': False, 'api_fixture': 'loopback music-library connectivity only',
            'captures': [], 'status': 'running'}


class CaptureApiHandler(BaseHTTPRequestHandler):
    # 연결 확인에만 응답한다. 인증·저장·결제 API는 제공하지 않는다.
    def do_GET(self):
        if self.path == '/api/mobile/client-editor/music-library':
            payload = b'{"categories": []}'
            self.send_response(200)
        else:
            payload = b'{"error": "capture fixture endpoint not found"}'
            self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *_args):
        pass


def command(*args, timeout=40, check=True):
    return subprocess.run(args, capture_output=True, timeout=timeout, check=check)


def adb(*args, **kwargs):
    return command('adb', *args, **kwargs)


def save_manifest():
    (OUT / 'captureverified.json').write_text(
        json.dumps(VERIFIED, ensure_ascii=False, indent=2) + '\n')


def screenshot(name):
    result = adb('exec-out', 'screencap', '-p')
    if not result.stdout.startswith(b'\x89PNG\r\n\x1a\n'):
        raise RuntimeError('Android screencap이 PNG를 반환하지 않았습니다.')
    (OUT / f'{name}.png').write_bytes(result.stdout)


def hierarchy():
    adb('shell', 'uiautomator', 'dump', '/sdcard/mobile-capture.xml', timeout=15)
    result = adb('exec-out', 'cat', '/sdcard/mobile-capture.xml')
    xml = result.stdout.decode('utf-8')
    return ET.fromstring(xml), xml


def tap(node):
    points = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', node.get('bounds', ''))
    if not points:
        return False
    left, top, right, bottom = map(int, points.groups())
    adb('shell', 'input', 'tap', str((left + right) // 2), str((top + bottom) // 2))
    return True


def open_route(path):
    adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW',
        '-d', f'exp://127.0.0.1:{PORT}/--/{path}', '-p', PACKAGE)


def dismiss_emulator_quickstep_anr(tree):
    # 에뮬레이터 런처의 ANR만 복구한다. 앱 자체의 ANR는 숨기지 않는다.
    labels = [
        (node.get('text') or node.get('content-desc') or '').strip()
        for node in tree.iter('node')
    ]
    if not any("Quickstep isn't responding" in value for value in labels):
        return False
    for choice in ('Close app', 'Wait'):
        for node in tree.iter('node'):
            label = (node.get('text') or node.get('content-desc') or '').strip()
            if label == choice and node.get('enabled') == 'true' and tap(node):
                return True
    return False


def dismiss_expo_dialog(tree):
    global TOOLS_BUTTON_DISABLED
    # Expo Go의 부유 도구 버튼을 실제 설정에서 숨긴다.
    if not TOOLS_BUTTON_DISABLED:
        for parent in tree.iter('node'):
            children = list(parent)
            if any(child.get('text') == 'Tools button' for child in children):
                if children and tap(children[-1]):
                    TOOLS_BUTTON_DISABLED = True
                    return True
    # 새 Expo Go 설치의 영문 온보딩과 Android 권한/링크 확인만 처리한다.
    labels = {'continue', 'get started', 'continue without signing in', 'got it',
              'allow', 'while using the app', 'only this time', 'open', 'just once',
              'not now', 'ok', 'dismiss', 'close'}
    for node in tree.iter('node'):
        package = node.get('package', '')
        label = (node.get('text') or node.get('content-desc') or '').strip().lower()
        if (package == PACKAGE or package.startswith('com.android.')) and label in labels:
            if node.get('enabled') == 'true' and tap(node):
                return True
    return False


def wait_screen(name, path, expected, timeout=180):
    deadline = time.monotonic() + timeout
    last_xml = ''
    retries = 0
    open_route(path)
    while time.monotonic() < deadline:
        try:
            tree, last_xml = hierarchy()
            text = '\n'.join((node.get('text', '') + ' ' + node.get('content-desc', ''))
                             for node in tree.iter('node'))
            errors = ['Something went wrong', 'Unable to resolve module', 'Uncaught Error',
                      'Unable to load script', 'Failed to download remote update']
            if any(error in text for error in errors):
                raise RuntimeError(f'{name}: 앱 오류 화면 감지: {text[:1600]}')
            floating_tools = next((node for node in tree.iter('node')
                                   if node.get('package') == PACKAGE
                                   and node.get('content-desc') == 'Tools'), None)
            if floating_tools is not None and tap(floating_tools):
                time.sleep(1)
                continue
            if dismiss_emulator_quickstep_anr(tree):
                time.sleep(2)
                continue
            if all(value in text for value in expected):
                (OUT / f'{name}.xml').write_text(last_xml)
                screenshot(name)
                VERIFIED['captures'].append({'file': f'{name}.png', 'route': '/' + path,
                                              'verified_text': expected,
                                              'fixture': path == 'design-check'})
                save_manifest()
                print(f'검증·캡처 완료: {name}', flush=True)
                return tree
            if dismiss_expo_dialog(tree):
                time.sleep(1)
                continue
            retries += 1
            if retries in (10, 25):
                open_route(path)
        except (subprocess.TimeoutExpired, ET.ParseError, subprocess.CalledProcessError):
            # 부팅/화면 전환 중 dump가 실패하면 남은 제한 시간 안에서 재시도한다.
            pass
        time.sleep(2)
    (OUT / f'{name}-timeout.xml').write_text(last_xml)
    raise RuntimeError(f'{name}: 실제 앱 문구 {expected!r}를 제한 시간 안에 확인하지 못했습니다.')


def capture_keyboard(tree):
    adb('shell', 'settings', 'put', 'secure', 'show_ime_with_hard_keyboard', '1')
    for node in tree.iter('node'):
        if node.get('class') == 'android.widget.EditText' and tap(node):
            deadline = time.monotonic() + 20
            while time.monotonic() < deadline:
                state = adb('shell', 'dumpsys', 'input_method').stdout.decode('utf-8', errors='replace')
                if re.search(r'(?:mInputShown|isInputViewShown)\s*=\s*true', state):
                    keyboard_tree, keyboard_xml = hierarchy()
                    keyboard_visible = any('inputmethod' in node.get('package', '')
                                           for node in keyboard_tree.iter('node'))
                    if not keyboard_visible:
                        time.sleep(1)
                        continue
                    (OUT / 'editor-keyboard.xml').write_text(keyboard_xml)
                    screenshot('editor-keyboard')
                    (OUT / 'editor-keyboard-input-method.txt').write_text(state)
                    VERIFIED['captures'].append({'file': 'editor-keyboard.png', 'route': '/design-check',
                                                  'fixture': True, 'keyboard_verified': True})
                    save_manifest()
                    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
                    return
                time.sleep(1)
    VERIFIED['keyboard_capture'] = '사용 가능한 입력창 또는 키보드 표시를 확인하지 못해 생략'
    save_manifest()


def diagnostics():
    for filename, args in [('logcat.txt', ('logcat', '-d', '-v', 'threadtime')),
                           ('activity.txt', ('shell', 'dumpsys', 'activity', 'activities')),
                           ('device.txt', ('shell', 'getprop'))]:
        try:
            result = adb(*args, timeout=15, check=False)
            (OUT / filename).write_bytes(result.stdout + result.stderr)
        except Exception as error:
            (OUT / filename).write_text(str(error))
    try:
        screenshot('diagnostic-final')
        _, xml = hierarchy()
        (OUT / 'diagnostic-final.xml').write_text(xml)
    except Exception as error:
        (OUT / 'diagnostic-error.txt').write_text(str(error))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    save_manifest()
    metro = None
    fixture_api = None
    original_route = ROUTE.read_bytes() if ROUTE.exists() else None
    original_modals_route = MODALS_ROUTE.read_bytes() if MODALS_ROUTE.exists() else None
    original_account_route = ACCOUNT_ROUTE.read_bytes() if ACCOUNT_ROUTE.exists() else None
    original_linked_route = LINKED_ROUTE.read_bytes() if LINKED_ROUTE.exists() else None
    try:
        shutil.copyfile(FIXTURE, ROUTE)
        shutil.copyfile(MODALS_FIXTURE, MODALS_ROUTE)
        shutil.copyfile(ACCOUNT_FIXTURE, ACCOUNT_ROUTE)
        shutil.copyfile(LINKED_FIXTURE, LINKED_ROUTE)
        fixture_api = ThreadingHTTPServer(('127.0.0.1', 19999), CaptureApiHandler)
        threading.Thread(target=fixture_api.serve_forever, daemon=True).start()
        env = {**os.environ, 'CI': '1', 'EXPO_OFFLINE': '1', 'EXPO_NO_TELEMETRY': '1',
               'EXPO_UNSTABLE_HEADLESS': '1', 'EXPO_PUBLIC_API_BASE': 'http://127.0.0.1:19999'}
        with (OUT / 'metro.log').open('w') as metro_log:
            metro = subprocess.Popen(
                ['npx', '--no-install', 'expo', 'start', '--offline', '--no-dev', '--minify',
                 '--port', str(PORT)], cwd=APP, env=env,
                stdout=metro_log, stderr=subprocess.STDOUT, start_new_session=True)
            deadline = time.monotonic() + 90
            while True:
                if metro.poll() is not None:
                    raise RuntimeError('Metro가 준비되기 전에 종료되었습니다. metro.log를 확인하세요.')
                try:
                    with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/status', timeout=2) as response:
                        if b'packager-status:running' in response.read():
                            break
                except OSError:
                    pass
                if time.monotonic() > deadline:
                    raise RuntimeError('Metro 준비 시간이 초과되었습니다.')
                time.sleep(1)
            with tempfile.TemporaryDirectory(prefix='mobile-expo-go-') as temp:
                apk = Path(temp) / 'expo-go.apk'
                urllib.request.urlretrieve(APK_URL, apk)
                digest = hashlib.sha256(apk.read_bytes()).hexdigest()
                if apk.stat().st_size != APK_SIZE or digest != APK_SHA256:
                    raise RuntimeError('Expo Go APK 크기 또는 SHA256이 공식 배포 파일과 다릅니다.')
                adb('install', '-r', str(apk), timeout=180)
            adb('reverse', f'tcp:{PORT}', f'tcp:{PORT}')
            adb('reverse', 'tcp:19999', 'tcp:19999')
            adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
            adb('shell', 'wm', 'dismiss-keyguard')
            wait_screen('my-invitations', '', ['내 청첩장', 'MODERN WEDDING EDITORIAL'])
            wait_screen('login', 'login', ['기존 청첩장 연결', '기기 연동 안내'])
            wait_screen('create', 'create', ['만들기', '기본 정보를 준비하고'])
            wait_screen('guide', 'guide', ['이용 안내', '진행할 작업을 선택해'])
            wait_screen('settings', 'settings', ['설정', '화면 설정'])
            wait_screen('account-list-12', 'design-check-accounts', ['계정별 전체 청첩장', '12개', '가상 청첩장 1'])
            wait_screen('linked-list', 'design-check-linked', ['연결한 청첩장', '현재 관리 중', '내용 수정'])
            tree = wait_screen('editor-fixture', 'design-check', ['샘플 청첩장 · 변경 사항 없음', '청첩장 편집', '기본 정보'])
            try:
                capture_keyboard(tree)
            except (subprocess.TimeoutExpired, subprocess.CalledProcessError) as error:
                VERIFIED['keyboard_capture'] = f'선택적 키보드 캡처 생략: {error}'
                save_manifest()
            for name, step, expected in [
                ('editor-schedule', 'schedule', ['청첩장 편집', '예식 일정']),
                ('editor-location', 'location', ['청첩장 편집', '예식장 주소와 연락처']),
                ('editor-greeting', 'greeting', ['청첩장 편집', '인사말']),
                ('editor-images', 'images', ['청첩장 편집', '대표 이미지']),
                ('editor-music', 'music', ['청첩장 편집', '배경음악 설정']),
            ]:
                wait_screen(name, f'design-check?step={step}', expected)
            wait_screen('editor-intro', 'design-check?step=intro', ['첫 화면 애니메이션', '빛에 담긴 초대'])
            for name, kind, expected in [
                ('modal-payment', 'payment', ['Google Play 결제', '결제 예정 금액']),
                ('modal-payment-pending', 'payment-pending', ['Google Play 결제', '이전 결제 이어서 처리']),
                ('modal-ticket', 'ticket', ['티켓 Google Play 결제', '티켓 수량']),
                ('modal-ticket-many', 'ticket-many', ['티켓 Google Play 결제', '티켓 수량']),
                ('modal-ticket-pending', 'ticket-pending', ['티켓 결제 이어서 처리', '기존 결제 대상']),
                ('modal-success', 'success', ['구매 완료됐습니다', '현재 보유 티켓']),
                ('modal-ticket-use', 'ticket-use', ['티켓 사용', '현재 보유 티켓']),
                ('modal-preview', 'preview', ['청첩장 미리보기', '디자인 샘플']),
                ('modal-share', 'share', ['카카오톡 카드 공유', '디자인 샘플']),
                ('modal-onboarding', 'onboarding', ['운영 시작 안내', '기본 문구와 이름']),
                ('modal-onboarding-last', 'onboarding-last', ['인사말과 공개 상태', '저장하고 시작']),
                ('modal-guestbook', 'guestbook', ['방명록 검색', '방명록 관리']),
                ('modal-guestbook-filled', 'guestbook-filled', ['방명록 검색', '방명록 관리']),
                ('modal-risk', 'risk', ['작업 확인', '링크 폐기']),
                ('modal-preparing', 'preparing', ['청첩장 편집 준비', '편집 정보를 불러오는 중입니다.']),
            ]:
                wait_screen(name, f'design-check-modals?kind={kind}', expected)
            VERIFIED['status'] = 'passed'
            save_manifest()
    except Exception as error:
        VERIFIED['status'] = 'failed'
        VERIFIED['error'] = str(error)
        save_manifest()
        raise
    finally:
        diagnostics()
        if fixture_api:
            fixture_api.shutdown()
            fixture_api.server_close()
        if metro and metro.poll() is None:
            os.killpg(metro.pid, signal.SIGTERM)
            try:
                metro.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(metro.pid, signal.SIGKILL)
        if original_route is None:
            ROUTE.unlink(missing_ok=True)
        else:
            ROUTE.write_bytes(original_route)
        if original_modals_route is None:
            MODALS_ROUTE.unlink(missing_ok=True)
        else:
            MODALS_ROUTE.write_bytes(original_modals_route)
        if original_account_route is None:
            ACCOUNT_ROUTE.unlink(missing_ok=True)
        else:
            ACCOUNT_ROUTE.write_bytes(original_account_route)
        if original_linked_route is None:
            LINKED_ROUTE.unlink(missing_ok=True)
        else:
            LINKED_ROUTE.write_bytes(original_linked_route)


if __name__ == '__main__':
    main()
