#!/usr/bin/env python3
"""서명 산출물을 동일 소스·버전·GitHub 실행에 연결하고 재검증합니다."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
import zipfile


PACKAGE = "kr.msgnote.mobileinvitation"
ANDROID = "{http://schemas.android.com/apk/res/android}"


def arguments(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("stage", "verify"))
    parser.add_argument("--directory", type=Path, required=True)
    parser.add_argument("--base-name", required=True)
    parser.add_argument("--version-name", required=True)
    parser.add_argument("--version-code", type=int, required=True)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--run-attempt", required=True)
    parser.add_argument("--manifest", type=Path)
    return parser.parse_args(argv)


def provenance(args):
    if not re.fullmatch(r"[a-f0-9]{40}", args.source_sha):
        raise ValueError("소스 SHA가 올바르지 않습니다.")
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?", args.version_name):
        raise ValueError("versionName 형식이 올바르지 않습니다.")
    if not 11 <= args.version_code <= 2100000000:
        raise ValueError("versionCode 범위가 올바르지 않습니다.")
    if not re.fullmatch(r"[1-9][0-9]*", args.run_id) or not re.fullmatch(r"[1-9][0-9]?", args.run_attempt):
        raise ValueError("GitHub 실행 정보가 올바르지 않습니다.")
    expected_name = f"invitation-{args.version_name}-code{args.version_code}-{args.source_sha[:12]}"
    if args.base_name != expected_name:
        raise ValueError("산출물 이름이 소스 및 버전과 다릅니다.")
    artifacts = {}
    for extension, required in (("apk", {"AndroidManifest.xml"}),
                                ("aab", {"BundleConfig.pb", "base/manifest/AndroidManifest.xml"})):
        name = f"{args.base_name}.{extension}"
        path = args.directory / name
        with zipfile.ZipFile(path) as archive:
            if not required.issubset(archive.namelist()) or archive.testzip():
                raise ValueError("APK/AAB 메타데이터 또는 ZIP 무결성이 올바르지 않습니다.")
        artifacts[name] = hashlib.sha256(path.read_bytes()).hexdigest()
    return {"schema_version": 1, "package_name": PACKAGE, "version_name": args.version_name,
            "version_code": args.version_code, "source_sha": args.source_sha,
            "run_id": args.run_id, "run_attempt": args.run_attempt, "artifacts": artifacts}


def main(argv=None):
    args = arguments(argv)
    try:
        expected = provenance(args)
        report = args.directory / "provenance.json"
        if args.command == "stage":
            if args.manifest is None:
                raise ValueError("bundletool로 추출한 AAB manifest가 필요합니다.")
            manifest = ET.parse(args.manifest).getroot()
            if (manifest.tag != "manifest" or manifest.get("package") != PACKAGE or
                    manifest.get(ANDROID + "versionCode") != str(args.version_code) or
                    manifest.get(ANDROID + "versionName") != args.version_name):
                raise ValueError("AAB 패키지·버전이 검증한 소스 및 APK와 다릅니다.")
            report.write_text(json.dumps(expected, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        elif json.loads(report.read_text(encoding="utf-8")) != expected:
            raise ValueError("서명 산출물의 소스·버전·실행 또는 SHA-256이 다릅니다.")
        print("APK/AAB 패키지·버전·소스·실행 및 SHA-256 검증 완료")
        return 0
    except (OSError, ValueError, ET.ParseError, zipfile.BadZipFile, RuntimeError):
        print("APK/AAB 출처 검증 실패: manifest, 파일 무결성, 소스 및 실행 정보를 확인하세요.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
