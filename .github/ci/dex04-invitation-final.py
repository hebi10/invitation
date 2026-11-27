import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
import zipfile


TEMP = Path(os.environ['RUNNER_TEMP'])
OUTPUT = TEMP / 'invitation-dex03'
EVIDENCE = TEMP / 'invitation-dex03-smoke'
PACKAGE = 'kr.msgnote.mobileinvitation'


def measure_bundle(bundle_path):
    markers = set()
    has_record_field = False
    with zipfile.ZipFile(bundle_path) as archive:
        dex = [item for item in archive.infolist() if re.fullmatch(r'base/dex/classes[0-9]*\.dex', item.filename)]
        assert dex, f'No DEX in {bundle_path.name}'
        for item in dex:
            dex_content = archive.read(item)
            has_record_field = has_record_field or b'Lexpo/modules/kotlin/records/Field;\x00' in dex_content
            for match in re.finditer(rb'~~(D8|R8)(\{[^\x00]{0,2048}\})', dex_content):
                try:
                    info, _ = json.JSONDecoder().raw_decode(match[2].decode('utf-8', errors='ignore'))
                except json.JSONDecodeError:
                    continue
                if info.get('version'):
                    markers.add((match[1].decode(), info['version']))
        return {
            'dex_bytes': sum(item.file_size for item in dex),
            'dex_count': len(dex),
            'compiler_markers': sorted(markers),
            'has_record_field_descriptor': has_record_field,
            'embedded_mapping': 'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map' in archive.namelist(),
            'bundle_bytes': bundle_path.stat().st_size,
            'bundle_sha256': hashlib.sha256(bundle_path.read_bytes()).hexdigest(),
        }


def verify_metrics():
    build_outputs = Path('apps/mobile/android/app/build/outputs')
    bundle = build_outputs / 'bundle/release/app-release.aab'
    mapping = build_outputs / 'mapping/release/mapping.txt'
    assert mapping.stat().st_size > 0, 'R8 mapping is empty'
    candidate = measure_bundle(bundle)
    assert any(compiler == 'R8' for compiler, _ in candidate['compiler_markers']), candidate
    assert candidate['embedded_mapping'], 'The AAB has no R8 mapping'
    assert candidate['has_record_field_descriptor'], 'Expo Record @Field was stripped or renamed'
    candidate['source_sha'] = os.environ['CANDIDATE_SHA']
    candidate['mapping_bytes'] = mapping.stat().st_size
    baseline_files = list((TEMP / 'invitation-baseline').rglob('*.aab'))
    baseline = None
    if baseline_files:
        assert len(baseline_files) == 1, baseline_files
        baseline = measure_bundle(baseline_files[0])
        assert any(compiler == 'D8' for compiler, _ in baseline['compiler_markers']), baseline
        assert baseline['dex_bytes'] > candidate['dex_bytes'], (baseline, candidate)
        baseline['source_sha'] = os.environ['BASELINE_SHA']
    result = {
        'variant': 'release',
        'version_code': os.environ['EXPO_ANDROID_VERSION_CODE'],
        'baseline_version_code': '30511',
        'baseline': baseline,
        'candidate': candidate,
        'reduction_percent': round((1 - candidate['dex_bytes'] / baseline['dex_bytes']) * 100, 2) if baseline else None,
    }
    payload = json.dumps(result, indent=2)
    (OUTPUT / 'dex-metrics.json').write_text(payload + '\n', encoding='utf-8')
    shutil.copy2(mapping, OUTPUT / 'mapping.txt')
    print(payload)
    with Path(os.environ['GITHUB_OUTPUT']).open('a', encoding='utf-8') as output:
        output.write(f'candidate_bytes={candidate["dex_bytes"]}\n')
        output.write(f'baseline_bytes={baseline["dex_bytes"] if baseline else "unavailable"}\n')
    with Path(os.environ['GITHUB_STEP_SUMMARY']).open('a', encoding='utf-8') as summary:
        summary.write('# Android release DEX QA\n\n```json\n' + payload + '\n```\n')


def adb(*args, check=True):
    return subprocess.run(['adb', *args], check=check, capture_output=True, timeout=45)


def dump_screen():
    adb('shell', 'uiautomator', 'dump', '/sdcard/dex03-window.xml')
    return adb('exec-out', 'cat', '/sdcard/dex03-window.xml').stdout


def find_node(value, timeout=45):
    deadline = time.monotonic() + timeout
    observed = set()
    while time.monotonic() < deadline:
        try:
            window = ET.fromstring(dump_screen())
            for node in window.iter('node'):
                if node.get('package') != PACKAGE:
                    continue
                labels = {node.get('text', ''), node.get('content-desc', '')}
                if value in labels:
                    return node
                observed.update(label for label in labels if label)
        except (ET.ParseError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
            time.sleep(1)
    raise AssertionError(f'Missing visible label {value!r}; observed {sorted(observed)!r}')


def tap(value):
    bounds = [int(token) for token in re.findall(r'\d+', find_node(value).get('bounds', ''))]
    assert len(bounds) == 4, (value, bounds)
    x1, y1, x2, y2 = bounds
    adb('shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))


def capture(name):
    (EVIDENCE / f'{name}.xml').write_bytes(dump_screen())
    (EVIDENCE / f'{name}.png').write_bytes(adb('exec-out', 'screencap', '-p').stdout)


def reveal_label(value):
    size = re.findall(rb'(\d+)x(\d+)', adb('shell', 'wm', 'size').stdout)
    width, height = map(int, size[-1])
    for _ in range(3):
        try:
            return find_node(value, timeout=6)
        except AssertionError:
            adb('shell', 'input', 'swipe', str(width // 2), str(height * 3 // 4), str(width // 2), str(height // 3), '500')
    return find_node(value)


def launch():
    response = adb('shell', 'am', 'start', '-W', '-n', f'{PACKAGE}/.MainActivity').stdout.decode()
    assert 'Status: ok' in response, response


def expect_version_code(expected):
    package_state = adb('shell', 'dumpsys', 'package', PACKAGE).stdout.decode()
    version = re.search(r'\bversionCode=(\d+)\b', package_state)
    assert version and version[1] == expected, f'Expected installed versionCode {expected}'


def verify_dark_theme():
    tap('설정 탭으로 이동')
    find_node('다크 모드 사용 중')


def smoke():
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    try:
        adb('logcat', '-c')
        adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
        adb('shell', 'wm', 'dismiss-keyguard')
        adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'enable')
        airplane_mode = adb('shell', 'settings', 'get', 'global', 'airplane_mode_on').stdout.strip()
        assert airplane_mode == b'1', airplane_mode
        adb('shell', 'svc', 'wifi', 'disable')
        print(adb('install', str(TEMP / 'invitation-baseline-qa.apk')).stdout.decode())
        expect_version_code('30511')
        launch()
        find_node('Invitation')
        tap('설정 탭으로 이동')
        tap('다크')
        find_node('다크 모드 사용 중')
        adb('shell', 'am', 'force-stop', PACKAGE)
        launch()
        find_node('Invitation')
        verify_dark_theme()
        capture('baseline-preference-persisted')
        print(adb('install', '-r', str(OUTPUT / 'invitation-dex03-qa.apk')).stdout.decode())
        expect_version_code(os.environ['EXPO_ANDROID_VERSION_CODE'])
        launch()
        find_node('Invitation')
        reveal_label('프리미엄 청첩장')
        capture('home')
        verify_dark_theme()
        capture('updated-preference-persisted')
        tap('만들기 탭으로 이동')
        find_node('청첩장 만들기')
        reveal_label('고객 계정 로그인')
        capture('create')
        tap('마이페이지 탭으로 이동')
        find_node('마이페이지')
        reveal_label('내 청첩장 확인')
        capture('account')
        adb('shell', 'am', 'force-stop', PACKAGE)
        launch()
        find_node('Invitation')
        capture('relaunch')
        verify_dark_theme()
        capture('relaunch-preference-persisted')
        pid = adb('shell', 'pidof', PACKAGE).stdout.decode().strip()
        assert pid, f'{PACKAGE} stopped after relaunch'
        (EVIDENCE / 'smoke.txt').write_text(
            'Baseline 30511 updated in place to optimized 30512. Dark theme persisted after the update and cold restart. Offline home, creation sign-in gate, and account navigation passed.\n',
            encoding='utf-8',
        )
    except Exception:
        (EVIDENCE / 'failure.png').write_bytes(adb('exec-out', 'screencap', '-p', check=False).stdout)
        try:
            (EVIDENCE / 'failure.xml').write_bytes(dump_screen())
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            pass
        (EVIDENCE / 'failure-log.txt').write_bytes(adb('logcat', '-d', '-t', '350', check=False).stdout)
        failure_pid = adb('shell', 'pidof', PACKAGE, check=False).stdout.decode().strip().split()
        if failure_pid:
            (EVIDENCE / 'app-log.txt').write_bytes(adb('logcat', '-d', '--pid', failure_pid[0], check=False).stdout)
        raise
    finally:
        (EVIDENCE / 'android-crash-log.txt').write_bytes(adb('logcat', '-d', '-b', 'crash', check=False).stdout)


if __name__ == '__main__':
    {'metrics': verify_metrics, 'smoke': smoke}[sys.argv[1]]()
