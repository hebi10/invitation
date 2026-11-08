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
import urllib.error
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
SYSTEM_ROUTE = APP / 'src/app/design-check-system.tsx'
SYSTEM_FIXTURE = ROOT / 'scripts/fixtures/mobile-system-capture.tsx.fixture'
ACCOUNT_LOGIN_ROUTE = APP / 'src/app/design-check-account-login.tsx'
ACCOUNT_LOGIN_FIXTURE = ROOT / 'scripts/fixtures/mobile-account-login-capture.tsx.fixture'
RECENT_STATUS_ROUTE = APP / 'src/app/design-check-recent-status.tsx'
RECENT_STATUS_FIXTURE = ROOT / 'scripts/fixtures/mobile-recent-status-capture.tsx.fixture'
KEYBOARD_ROUTE = APP / 'src/app/design-check-keyboard.tsx'
KEYBOARD_FIXTURE = ROOT / 'scripts/fixtures/mobile-keyboard-capture.tsx.fixture'
CREATE_SUCCESS_ROUTE = APP / 'src/app/design-check-create-success.tsx'
CREATE_SUCCESS_FIXTURE = ROOT / 'scripts/fixtures/mobile-create-success-capture.tsx.fixture'
HOME_QA_ROUTE = APP / 'src/app/design-check-home.tsx'
HOME_QA_FIXTURE = ROOT / 'scripts/fixtures/mobile-home-capture.tsx.fixture'
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


def download_verified_expo_go_apk(destination):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(APK_URL, timeout=90) as response:
                with destination.open('wb') as output:
                    shutil.copyfileobj(response, output)
        except urllib.error.HTTPError as error:
            destination.unlink(missing_ok=True)
            if error.code not in (429, 500, 502, 503, 504) or attempt == 3:
                raise
            print(f'Expo Go APK download returned HTTP {error.code}; retrying', flush=True)
        except (urllib.error.URLError, TimeoutError) as error:
            destination.unlink(missing_ok=True)
            if attempt == 3:
                raise
            print(f'Expo Go APK transient download error: {type(error).__name__}; retrying', flush=True)
        else:
            digest = hashlib.sha256(destination.read_bytes()).hexdigest()
            if destination.stat().st_size != APK_SIZE or digest != APK_SHA256:
                raise RuntimeError('Expo Go APK 크기 또는 SHA256이 공식 배포 파일과 다릅니다.')
            return
        time.sleep(min(5 * 2 ** attempt, 20))


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


def audit_visible_action(name, tree, label, minimum_dp=44):
    """실제 클릭 가능 버튼의 영역이 화면 밖으로 잘리지 않았는지 확인한다."""
    candidates = [
        node for node in tree.iter('node')
        if node.get('clickable') == 'true'
        and node.get('enabled') == 'true'
        and (node.get('content-desc') or node.get('text') or '').strip() == label
    ]
    if not candidates:
        raise RuntimeError(f'{name}: 클릭 가능한 버튼 {label!r}를 찾지 못했습니다.')

    size_output = adb('shell', 'wm', 'size').stdout.decode('utf-8', errors='replace')
    width_values = re.findall(r'(?:Physical|Override) size:\s*(\d+)x(\d+)', size_output)
    density_output = adb('shell', 'wm', 'density').stdout.decode('utf-8', errors='replace')
    density_values = re.findall(r'(?:Physical|Override) density:\s*(\d+)', density_output)
    if not width_values or not density_values:
        raise RuntimeError(f'{name}: Android 화면 크기나 밀도를 확인하지 못했습니다.')
    window_width, window_height = map(int, width_values[-1])
    density = int(density_values[-1])

    for node in candidates:
        points = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', node.get('bounds', ''))
        if not points:
            continue
        left, top, right, bottom = map(int, points.groups())
        height_dp = (bottom - top) * 160 / density
        if 0 <= left < right <= window_width and 0 <= top < bottom <= window_height and height_dp >= minimum_dp:
            VERIFIED.setdefault('action_visibility_audits', []).append({
                'screen': name, 'action': label,
                'height_dp': round(height_dp, 1),
                'bounds': [left, top, right, bottom],
            })
            save_manifest()
            return
    raise RuntimeError(f'{name}: {label!r} 버튼이 화면 밖에 있거나 {minimum_dp}dp 미만입니다.')


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


def wait_screen(name, path, expected, timeout=180, launch=True):
    deadline = time.monotonic() + timeout
    last_xml = ''
    retries = 0
    if launch:
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
            if launch and retries in (10, 25):
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


def capture_responsive_views():
    size_output = adb('shell', 'wm', 'size').stdout.decode('utf-8', errors='replace')
    physical_size = re.search(r'Physical size:\s*(\d+)x(\d+)', size_output)
    if not physical_size:
        raise RuntimeError(f'Android 화면 크기를 확인할 수 없습니다: {size_output}')
    physical_width = int(physical_size.group(1))
    layouts = [
        (320, [
            ('editor', 'design-check', ['청첩장 편집', '기본 정보']),
            ('settings', 'settings', ['설정', '화면 설정']),
            ('checkout', 'design-check-modals?kind=payment', ['Google Play 결제', '결제 예정 금액']),
        ]),
        (360, [
            ('guide', 'guide', ['마이페이지', '고객 계정 로그인']),
            ('settings', 'settings', ['설정', '화면 설정']),
            ('create', 'create', ['청첩장 만들기', '5,000원']),
        ]),
        (390, [
            ('editor', 'design-check', ['청첩장 편집', '기본 정보']),
            ('account-list', 'design-check-accounts', ['계정별 전체 청첩장', '12개']),
            ('preview', 'design-check-modals?kind=preview', ['청첩장 미리보기', '디자인 샘플']),
        ]),
        (430, [
            ('settings', 'settings', ['설정', '화면 설정']),
            ('home', 'design-check-home', ['Invitation', 'MODERN WEDDING EDITORIAL']),
            ('renew', 'design-check-modals?kind=renew', ['이용 기간 연장', '연장 결제 확인']),
        ]),
        (600, [
            ('home', 'design-check-home', ['Invitation', 'MODERN WEDDING EDITORIAL']),
            ('account-list', 'design-check-accounts', ['계정별 전체 청첩장', '12개']),
            ('editor', 'design-check', ['청첩장 편집', '기본 정보']),
            ('checkout', 'design-check-modals?kind=payment', ['Google Play 결제', '결제 예정 금액']),
        ]),
        (840, [
            ('create', 'create', ['청첩장 만들기', '5,000원']),
            ('account-list', 'design-check-accounts', ['계정별 전체 청첩장', '12개']),
            ('home', 'design-check-home', ['Invitation', 'MODERN WEDDING EDITORIAL']),
            ('preview', 'design-check-modals?kind=preview', ['청첩장 미리보기', '디자인 샘플']),
        ]),
    ]
    try:
        for width_dp, cases in layouts:
            density = round(physical_width * 160 / width_dp)
            adb('shell', 'wm', 'density', str(density))
            time.sleep(3)
            for label, route, expected in cases:
                name = f'layout-{width_dp}-{label}'
                screen_tree = wait_screen(name, route, expected)
                if label == 'checkout':
                    audit_visible_action(name, screen_tree, '5,000원 결제하기')
                    audit_visible_action(name, screen_tree, '다시 확인하기')
                elif label == 'editor':
                    audit_visible_action(name, screen_tree, '저장 후 다음')
                elif label == 'renew':
                    audit_visible_action(name, screen_tree, '5,000원 결제로 6개월 연장')
                if label in {'editor', 'checkout', 'preview', 'renew'}:
                    # QA 전용 전면 모달은 경로 이동 후에도 이전 화면 위에 남을 수 있다.
                    # 독립 화면 검증을 위해 Expo Go만 초기화한다. 저장·계정·결제 상태는 사용하지 않는다.
                    adb('shell', 'am', 'force-stop', PACKAGE, check=False)
                    time.sleep(1)
            VERIFIED.setdefault('responsive_dp_widths', []).append(width_dp)
            save_manifest()
    finally:
        adb('shell', 'wm', 'density', 'reset', check=False)


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
    original_system_route = SYSTEM_ROUTE.read_bytes() if SYSTEM_ROUTE.exists() else None
    original_account_login_route = ACCOUNT_LOGIN_ROUTE.read_bytes() if ACCOUNT_LOGIN_ROUTE.exists() else None
    original_recent_status_route = RECENT_STATUS_ROUTE.read_bytes() if RECENT_STATUS_ROUTE.exists() else None
    original_keyboard_route = KEYBOARD_ROUTE.read_bytes() if KEYBOARD_ROUTE.exists() else None
    original_create_success_route = CREATE_SUCCESS_ROUTE.read_bytes() if CREATE_SUCCESS_ROUTE.exists() else None
    original_home_qa_route = HOME_QA_ROUTE.read_bytes() if HOME_QA_ROUTE.exists() else None
    try:
        shutil.copyfile(FIXTURE, ROUTE)
        shutil.copyfile(MODALS_FIXTURE, MODALS_ROUTE)
        shutil.copyfile(ACCOUNT_FIXTURE, ACCOUNT_ROUTE)
        shutil.copyfile(LINKED_FIXTURE, LINKED_ROUTE)
        shutil.copyfile(SYSTEM_FIXTURE, SYSTEM_ROUTE)
        shutil.copyfile(ACCOUNT_LOGIN_FIXTURE, ACCOUNT_LOGIN_ROUTE)
        shutil.copyfile(RECENT_STATUS_FIXTURE, RECENT_STATUS_ROUTE)
        shutil.copyfile(KEYBOARD_FIXTURE, KEYBOARD_ROUTE)
        shutil.copyfile(CREATE_SUCCESS_FIXTURE, CREATE_SUCCESS_ROUTE)
        shutil.copyfile(HOME_QA_FIXTURE, HOME_QA_ROUTE)
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
                download_verified_expo_go_apk(apk)
                adb('install', '-r', str(apk), timeout=180)
            adb('reverse', f'tcp:{PORT}', f'tcp:{PORT}')
            adb('reverse', 'tcp:19999', 'tcp:19999')
            adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
            adb('shell', 'wm', 'dismiss-keyguard')
            adb('shell', 'settings', 'put', 'secure', 'show_ime_with_hard_keyboard', '1')
            wait_screen('my-invitations', '', ['홈', 'MODERN WEDDING EDITORIAL'])
            wait_screen('login', 'login', ['기존 청첩장 연결', '기기 연동 안내'])
            wait_screen('create', 'create', ['만들기', '고객 계정 로그인'])
            success_tree = wait_screen('create-success-fixture', 'design-check-create-success',
                                      ['제작 시작', '결제가 완료되었습니다', '새 청첩장 초안'])
            if any(node.get('content-desc') == '마이페이지에서 편집 시작'
                   and node.get('clickable') == 'true' and node.get('enabled') == 'true'
                   for node in success_tree.iter('node')):
                audit_visible_action('create-success-fixture', success_tree, '마이페이지에서 편집 시작')
            else:
                raise RuntimeError('create-success-fixture: 마이페이지 편집 행동을 찾지 못했습니다.')
            wait_screen('guide', 'guide', ['마이페이지', '고객 계정 로그인'])
            wait_screen('settings', 'settings', ['설정', '화면 설정'])
            wait_screen('account-list-0', 'design-check-accounts?count=0', ['계정별 전체 청첩장', '0개', '계정에 등록된 청첩장이 없습니다'])
            wait_screen('account-list-1', 'design-check-accounts?count=1', ['계정별 전체 청첩장', '1개', '가상 청첩장 1'])
            wait_screen('account-list-12', 'design-check-accounts', ['계정별 전체 청첩장', '12개', '가상 청첩장 1'])
            wait_screen('account-sign-in', 'design-check-account-login', ['고객 계정 로그인', '로그인하고 청첩장 조회', '회원가입', '비밀번호 재설정'])
            wait_screen('recent-linked-status', 'design-check-recent-status', ['최근 연동 상태', '노출 종료', '주소 복사'])
            wait_screen('linked-list', 'design-check-linked', ['기기 연동 청첩장', '현재 관리 중', '내용 수정'])
            wait_screen('editor-fixture', 'design-check', ['샘플 청첩장 · 변경 사항 없음', '청첩장 편집', '기본 정보'])
            wait_screen('editor-save-error', 'design-check?step=save-error', ['저장 실패', '입력값은 유지됩니다', '기본 정보'])
            wait_screen('editor-family-ready', 'design-check?step=family-filled', ['청첩장 편집', '기본 정보'])
            for scroll_attempt in range(18):
                family_tree, family_xml = hierarchy()
                visible_values = []
                for node in family_tree.iter('node'):
                    label = (node.get('text') or node.get('content-desc') or '').strip()
                    if label not in {'김아버지', '신랑 부모님 정보', '신랑 정보'}:
                        continue
                    points = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', node.get('bounds', ''))
                    if not points:
                        continue
                    left, top, right, bottom = map(int, points.groups())
                    if right > left and bottom > top and top < 2350 and bottom > 980:
                        visible_values.append(label)
                if '김아버지' in visible_values:
                    (OUT / 'editor-family-filled.xml').write_text(family_xml)
                    screenshot('editor-family-filled')
                    VERIFIED['captures'].append({
                        'file': 'editor-family-filled.png',
                        'route': '/design-check?step=family-filled',
                        'verified_text': ['김아버지'],
                        'fixture': True,
                        'populated_optional_fields_visible': True,
                    })
                    save_manifest()
                    print('검증·캡처 완료: editor-family-filled', flush=True)
                    break
                adb('shell', 'input', 'swipe', '720', '1940', '720', '1450', '300')
                time.sleep(0.7)
            else:
                raise RuntimeError('editor-family-filled: 저장된 혼주 이름을 펼쳐진 입력창에서 확인하지 못했습니다.')
            keyboard_tree = wait_screen(
                'editor-keyboard-ready', 'design-check-keyboard',
                ['청첩장 편집', '키보드 확인 입력', '저장 후 다음'],
            )
            keyboard_input = next(
                (node for node in keyboard_tree.iter('node')
                 if node.get('class') == 'android.widget.EditText'
                 and node.get('content-desc') == '키보드 확인 입력'),
                None,
            )
            if keyboard_input is None or not tap(keyboard_input):
                raise RuntimeError('키보드 검수용 입력창을 실제 터치할 수 없습니다.')
            wait_screen(
                'editor-keyboard', 'design-check-keyboard',
                ['청첩장 편집', '키보드 확인 입력', '키보드 표시 중', '내용 저장'],
                timeout=45, launch=False,
            )
            VERIFIED['keyboard_capture'] = '실제 입력창 터치·keyboardDidShow 이벤트·컴팩트 저장 버튼 확인'
            keyboard_action_tree, _ = hierarchy()
            audit_visible_action('editor-keyboard', keyboard_action_tree, '내용 저장')
            VERIFIED['captures'][-1]['keyboard_verified'] = True
            save_manifest()
            adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
            for name, step, expected in [
                ('editor-schedule', 'schedule', ['청첩장 편집', '예식 일정']),
                ('editor-location', 'location', ['청첩장 편집', '예식장 주소', '입력한 주소로 위치 검색']),
                ('editor-greeting', 'greeting', ['청첩장 편집', '인사말']),
                ('editor-images', 'images', ['청첩장 편집', '대표 이미지']),
                ('editor-music', 'music', ['청첩장 편집', '배경음악 설정']),
            ]:
                wait_screen(name, f'design-check?step={step}', expected)
            intro_tree = wait_screen(
                'editor-intro-closed', 'design-check?step=intro',
                ['첫 화면 애니메이션 (선택)', '공유 제목과 설명'],
            )
            intro_toggle = next(
                (node for node in intro_tree.iter('node')
                 if node.get('content-desc') == '첫 화면 애니메이션 (선택)'
                 and node.get('enabled') == 'true'), None,
            )
            if intro_toggle is None or not tap(intro_toggle):
                raise RuntimeError('intro disclosure: 첫 화면 애니메이션 펼침 버튼을 찾거나 누르지 못했습니다.')
            wait_screen('editor-intro', 'design-check?step=intro',
                        ['첫 화면 애니메이션', '현재 선택한 연출', '사용 안 함'], timeout=45, launch=False)
            for name, kind, expected in [
                ('modal-payment', 'payment', ['Google Play 결제', '결제 예정 금액']),
                ('modal-payment-pending', 'payment-pending', ['Google Play 결제', '이전 결제 이어서 처리']),
                ('modal-payment-error', 'payment-error', ['Google Play 결제 확인', '로그인 확인에 실패했습니다']),
                ('modal-renew', 'renew', ['이용 기간 연장', '연장 결제 확인']),
                ('modal-renew-pending', 'renew-pending', ['이용 기간 연장', '미처리 결제가 있습니다']),
                ('modal-renew-other', 'renew-other', ['이용 기간 연장', '대상 청첩장']),
                ('modal-renew-loading', 'renew-loading', ['이용 기간 연장', '결제 예정 금액']),
                ('modal-renew-no-account', 'renew-no-account', ['이용 기간 연장', '소유자 계정']),
                ('modal-preview', 'preview', ['청첩장 미리보기', '디자인 샘플']),
                ('modal-share', 'share', ['카카오톡 카드 공유', '디자인 샘플']),
                ('modal-onboarding', 'onboarding', ['운영 시작 안내', '기본 문구와 이름']),
                ('modal-onboarding-last', 'onboarding-last', ['인사말과 공개 상태', '저장하고 시작']),
                ('modal-guestbook', 'guestbook', ['방명록 검색', '방명록 관리']),
                ('modal-guestbook-filled', 'guestbook-filled', ['방명록 검색', '방명록 관리']),
                ('modal-guestbook-long', 'guestbook-long', ['방명록 검색', '방명록 관리']),
                ('modal-risk', 'risk', ['작업 확인', '링크 폐기']),
                ('modal-risk-error', 'risk-error', ['작업 확인', '세션 확인에 실패했습니다']),
                ('modal-preparing', 'preparing', ['청첩장 편집 준비', '편집 정보를 불러오는 중입니다.']),
            ]:
                wait_screen(name, f'design-check-modals?kind={kind}', expected)
            onboarding_error_tree = wait_screen(
                'modal-onboarding-error-ready', 'design-check-modals?kind=onboarding-error',
                ['기본 문구와 이름', '다음'],
            )
            onboarding_next_button = next(
                (node for node in onboarding_error_tree.iter('node')
                 if (node.get('text') == '다음' or node.get('content-desc') == '다음')
                 and node.get('enabled') == 'true'), None,
            )
            if onboarding_next_button is None or not tap(onboarding_next_button):
                raise RuntimeError('모달 필수 입력 검증 버튼을 찾거나 누르지 못했습니다.')
            wait_screen(
                'modal-onboarding-error', 'design-check-modals?kind=onboarding-error',
                ['신랑 이름을 입력해 주세요', '다음'], timeout=45, launch=False,
            )
            modal_keyboard_tree = wait_screen(
                'modal-keyboard-ready', 'design-check-modals?kind=keyboard',
                ['입력 모달 키보드 검증', '모달 키보드 테스트 입력', '모달 키보드 열기 대기'],
            )
            modal_keyboard_input = next(
                (node for node in modal_keyboard_tree.iter('node')
                 if node.get('class') == 'android.widget.EditText'
                 and node.get('content-desc') == '모달 키보드 테스트 입력'), None,
            )
            if modal_keyboard_input is None or not tap(modal_keyboard_input):
                raise RuntimeError('모달 키보드 검수용 입력창을 실제 터치할 수 없습니다.')
            wait_screen(
                'modal-keyboard', 'design-check-modals?kind=keyboard',
                ['입력 모달 키보드 검증', '모달 키보드 표시 중', '확인'],
                timeout=45, launch=False,
            )
            VERIFIED['modal_keyboard_capture'] = '모달 입력창 터치·키보드 이벤트·하단 확인 버튼 표시'
            keyboard_button_tree, _ = hierarchy()
            audit_visible_action('modal-keyboard', keyboard_button_tree, '확인')
            save_manifest()
            adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
            for name, kind, expected in [
                ('settings-dark', 'dark', ['설정', '다크 모드 사용 중']),
                ('settings-large', 'large', ['설정', '큰 글자 크기 사용 중']),
                ('system-error', 'error', ['화면 오류', '문제가 발생했습니다', '다시 시도']),
                ('system-not-found', 'not-found', ['페이지 없음', '페이지를 찾을 수 없습니다']),
                ('system-toast-error', 'toast-error', ['시스템 알림 검수', '알림 검증: 연결 상태를 확인해 주세요.']),
                ('system-toast-success', 'toast-success', ['시스템 알림 검수', '알림 검증: 청첩장 정보를 저장했습니다.']),
                ('system-toast-notice', 'toast-notice', ['시스템 알림 검수', '알림 검증: 변경 사항을 확인해 주세요.']),
                ('system-toast-neutral', 'toast-neutral', ['시스템 알림 검수', '알림 검증: 설정이 반영되었습니다.']),
                ('system-loading', 'loading', ['정보 불러오기', '청첩장 정보를 불러오는 중입니다.']),
            ]:
                wait_screen(name, f'design-check-system?kind={kind}', expected)
            capture_responsive_views()
            VERIFIED['responsive_widths_note'] = '600dp/840dp는 Android 에뮬레이터 밀도 기반 폭 시뮬레이션이며 실기기 폴더블·태블릿 검증은 별도입니다.'
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
        if original_system_route is None:
            SYSTEM_ROUTE.unlink(missing_ok=True)
        else:
            SYSTEM_ROUTE.write_bytes(original_system_route)
        if original_account_login_route is None:
            ACCOUNT_LOGIN_ROUTE.unlink(missing_ok=True)
        else:
            ACCOUNT_LOGIN_ROUTE.write_bytes(original_account_login_route)
        if original_recent_status_route is None:
            RECENT_STATUS_ROUTE.unlink(missing_ok=True)
        else:
            RECENT_STATUS_ROUTE.write_bytes(original_recent_status_route)
        if original_keyboard_route is None:
            KEYBOARD_ROUTE.unlink(missing_ok=True)
        else:
            KEYBOARD_ROUTE.write_bytes(original_keyboard_route)
        if original_create_success_route is None:
            CREATE_SUCCESS_ROUTE.unlink(missing_ok=True)
        else:
            CREATE_SUCCESS_ROUTE.write_bytes(original_create_success_route)
        if original_home_qa_route is None:
            HOME_QA_ROUTE.unlink(missing_ok=True)
        else:
            HOME_QA_ROUTE.write_bytes(original_home_qa_route)


if __name__ == '__main__':
    main()
