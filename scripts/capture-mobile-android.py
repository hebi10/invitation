#!/usr/bin/env python3
"""실계정 없이 Expo Go의 실제 Android 화면을 검증하고 캡처한다."""

import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import tempfile
import time
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/mobile-android'
APP = ROOT / 'apps/mobile'
ROUTE = APP / 'src/app/design-check.tsx'
FIXTURE = ROOT / 'scripts/fixtures/mobile-editor-capture.tsx.fixture'
APK_URL = 'https://github.com/expo/expo-go-releases/releases/download/Expo-Go-55.0.7/Expo-Go-55.0.7.apk'
APK_SIZE = 195851103
APK_SHA256 = '6368eec8973ebb011c6f4f9d32afebe3fc64dd3125f2c0b529767e88dccf64ab'
PACKAGE = 'host.exp.exponent'
PORT = 8092
VERIFIED = {'environment': 'Android API 35 / Expo Go 55.0.7',
            'uses_live_account': False, 'captures': [], 'status': 'running'}


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


def dismiss_expo_dialog(tree):
    # 새 Expo Go 설치의 영문 온보딩과 Android 권한/링크 확인만 처리한다.
    labels = {'continue', 'get started', 'continue without signing in', 'got it',
              'allow', 'while using the app', 'only this time', 'open', 'just once',
              'not now', 'ok', 'dismiss'}
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
            if all(value in text for value in expected):
                (OUT / f'{name}.xml').write_text(last_xml)
                screenshot(name)
                VERIFIED['captures'].append({'file': f'{name}.png', 'route': '/' + path,
                                              'verified_text': expected,
                                              'fixture': path == 'design-check'})
                save_manifest()
                print(f'검증·캡처 완료: {name}', flush=True)
                return tree
            errors = ['Something went wrong', 'Unable to resolve module', 'Uncaught Error',
                      'Unable to load script', 'Failed to download remote update']
            if any(error in text for error in errors):
                raise RuntimeError(f'{name}: 앱 오류 화면 감지: {text[:1600]}')
            if dismiss_expo_dialog(tree):
                open_route(path)
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
    for node in tree.iter('node'):
        if node.get('class') == 'android.widget.EditText' and tap(node):
            deadline = time.monotonic() + 20
            while time.monotonic() < deadline:
                state = adb('shell', 'dumpsys', 'input_method').stdout.decode('utf-8', errors='replace')
                if re.search(r'(?:mInputShown|isInputViewShown)\s*=\s*true', state):
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
    original_route = ROUTE.read_bytes() if ROUTE.exists() else None
    try:
        shutil.copyfile(FIXTURE, ROUTE)
        env = {**os.environ, 'CI': '1', 'EXPO_OFFLINE': '1', 'EXPO_NO_TELEMETRY': '1',
               'EXPO_UNSTABLE_HEADLESS': '1', 'EXPO_PUBLIC_API_BASE': 'http://127.0.0.1:19999'}
        with (OUT / 'metro.log').open('w') as metro_log:
            metro = subprocess.Popen(
                ['npx', '--no-install', 'expo', 'start', '--offline', '--no-dev', '--minify',
                 '--localhost', '--port', str(PORT)], cwd=APP, env=env,
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
            adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
            adb('shell', 'wm', 'dismiss-keyguard')
            wait_screen('my-invitations', '', ['내 청첩장', '청첩장을 준비해 볼까요?'])
            wait_screen('create', 'create', ['만들기', '기본 정보를 준비하고'])
            wait_screen('guide', 'guide', ['이용 안내', '진행할 작업을 선택해'])
            wait_screen('settings', 'settings', ['설정', '화면 설정'])
            tree = wait_screen('editor-fixture', 'design-check', ['검수용 예시', '실제 저장 없음', '기본 정보'])
            capture_keyboard(tree)
            VERIFIED['status'] = 'passed'
            save_manifest()
    except Exception as error:
        VERIFIED['status'] = 'failed'
        VERIFIED['error'] = str(error)
        save_manifest()
        raise
    finally:
        diagnostics()
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


if __name__ == '__main__':
    main()
