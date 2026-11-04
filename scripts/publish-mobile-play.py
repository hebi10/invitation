#!/usr/bin/env python3
"""기존 Google Play 테스트 트랙에 서명된 AAB를 게시합니다."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile


PACKAGE = "kr.msgnote.mobileinvitation"
ORIGIN = "https://androidpublisher.googleapis.com"
BASE = f"/androidpublisher/v3/applications/{PACKAGE}"
STATES = {
    "PUBLISHED": ("published", "테스터 제공 중"),
    "DRAFT": ("draft", "초안 저장 완료 · 테스터 배포 전"),
    "NOT_SENT_FOR_REVIEW": ("not_sent_for_review", "심사 전송 대기"),
    "IN_REVIEW": ("in_review", "심사 중"),
    "APPROVED_NOT_PUBLISHED": ("approved_not_published", "승인 완료 · 게시 대기"),
    "NOT_APPROVED": ("not_approved", "심사 미승인"),
}
STATE_PREFIX = "RELEASE_LIFECYCLE_STATE_"


class PlayError(Exception):
    def __init__(self, message, uncertain=False):
        super().__init__(message)
        self.uncertain = uncertain


def arguments(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--aab", type=Path, required=True)
    parser.add_argument("--version-code", type=int, required=True)
    parser.add_argument("--track", required=True)
    parser.add_argument("--target", choices=("internal", "closed"), default="internal")
    parser.add_argument("--release-name", required=True)
    parser.add_argument("--notes-file", type=Path, required=True)
    parser.add_argument("--status", choices=("draft", "completed"), default="completed")
    parser.add_argument("--send-for-review", action="store_true")
    return parser.parse_args(argv)


def read_inputs(args, token):
    if not token or "\r" in token or "\n" in token:
        raise PlayError("PLAY_ACCESS_TOKEN 환경변수에 유효한 OAuth access token이 필요합니다.")
    if args.target == "internal":
        if args.track != "internal":
            raise PlayError("내부 테스트 대상은 정확히 internal 트랙만 사용할 수 있습니다.")
    else:
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,99}", args.track):
            raise PlayError("비공개 테스트 트랙 ID 형식이 올바르지 않습니다.")
        if args.track.lower() in {"production", "beta", "internal", "internalsharing", "qa"}:
            raise PlayError("비공개 테스트 대상에는 예약된 트랙 ID를 사용할 수 없습니다.")
    if not 1 <= args.version_code <= 2100000000:
        raise PlayError("versionCode는 1~2100000000 범위의 정수여야 합니다.")
    if not args.release_name.strip() or any(c in args.release_name for c in "\r\n"):
        raise PlayError("출시 이름은 비어 있지 않은 한 줄이어야 합니다.")
    try:
        data = args.aab.read_bytes()
        with zipfile.ZipFile(args.aab) as archive:
            required = {"BundleConfig.pb", "base/manifest/AndroidManifest.xml"}
            if not required.issubset(archive.namelist()) or archive.testzip():
                raise PlayError("AAB의 필수 메타데이터 또는 ZIP 무결성을 확인할 수 없습니다.")
        notes = args.notes_file.read_text(encoding="utf-8").strip()
    except (OSError, UnicodeError, zipfile.BadZipFile, RuntimeError):
        raise PlayError("AAB 또는 UTF-8 출시 노트 파일을 읽을 수 없습니다.") from None
    if not notes:
        raise PlayError("출시 노트가 비어 있습니다.")
    return data, hashlib.sha256(data).hexdigest(), notes


def request_operation(method, path):
    endpoint = path.partition("?")[0]
    edit = re.escape(BASE) + r"/edits/[^/:]+"
    operations = [
        ("POST", re.escape(BASE) + r"/edits", "edits.create"),
        ("GET", edit + r"/tracks", "tracks.list"),
        ("GET", edit + r"/bundles", "bundles.list"),
        ("GET", edit + r"/apks", "apks.list"),
        ("GET", re.escape(BASE) + r"/tracks/[^/]+/releases", "releases.list"),
        ("POST", r"/upload" + edit + r"/bundles", "bundles.upload"),
        ("PUT", edit + r"/tracks/[^/]+", "tracks.update"),
        ("POST", edit + r":validate", "edits.validate"),
        ("POST", edit + r":commit", "edits.commit"),
        ("DELETE", edit, "edits.delete"),
    ]
    return next((name for expected, pattern, name in operations
                 if method == expected and re.fullmatch(pattern, endpoint)), "unknown")


def safe_google_error(body, token):
    try:
        parsed = json.loads(body)
    except ValueError:
        return {}
    error = parsed.get("error") if isinstance(parsed, dict) else None
    if not isinstance(error, dict):
        return {}
    result = {}
    if type(error.get("code")) is int and 100 <= error["code"] <= 599:
        result["code"] = error["code"]
    statuses = {"OK", "CANCELLED", "UNKNOWN", "INVALID_ARGUMENT", "DEADLINE_EXCEEDED",
                "NOT_FOUND", "ALREADY_EXISTS", "PERMISSION_DENIED", "UNAUTHENTICATED",
                "RESOURCE_EXHAUSTED", "FAILED_PRECONDITION", "ABORTED", "OUT_OF_RANGE",
                "UNIMPLEMENTED", "INTERNAL", "UNAVAILABLE", "DATA_LOSS"}
    status = error.get("status")
    if isinstance(status, str) and status in statuses and token not in status:
        result["status"] = status
    message = error.get("message")
    if isinstance(message, str):
        for _ in range(2):
            message = urllib.parse.unquote(message)
        message = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", message)
        message = " ".join("".join(char for char in message if char.isprintable() or char.isspace()).split())
        if token and token in "".join(message.split()) and token not in message:
            message = "[sensitive message omitted]"
        for value in {token, urllib.parse.quote(token, safe=""), urllib.parse.quote_plus(token)}:
            if value:
                message = message.replace(value, "[redacted]")
        if re.search(r"authorization|bearer|password|passphrase|storepass|keypass|private[_ -]?key|"
                     r"secret|credential|cookie|api[_-]?key|(?:access|refresh|id)[_-]?token|alias", message, re.I):
            message = "[sensitive message omitted]"
        message = re.sub(r"(?i)(?:\b[a-z][a-z0-9+.-]*:)?//[^\s<>\"']+", "[URL omitted]", message)
        message = message.replace("::", ":")
        if message:
            result["message"] = message[:300]
    return result


def request(token, method, path, payload=None, media=None):
    headers = {"Authorization": f"Bearer {token}"}
    data = media
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
    if media is not None:
        headers["Content-Type"] = "application/octet-stream"
        headers["Content-Length"] = str(len(media))
    req = urllib.request.Request(ORIGIN + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=180 if media is not None else 60) as response:
            body = response.read()
        result = json.loads(body) if body else {}
        if not isinstance(result, dict):
            raise ValueError()
        return result
    except urllib.error.HTTPError as error:
        try:
            body = error.read(16384).decode("utf-8", errors="replace")
        except OSError:
            body = ""
        finally:
            error.close()
        message = body.lower()
        safe_method = method if method in {"GET", "POST", "PUT", "DELETE"} else "UNKNOWN"
        diagnostic = f"HTTP {error.code}; {safe_method} {request_operation(method, path)}"
        details = safe_google_error(body, token)
        if details:
            diagnostic += "; Google error: " + json.dumps(details, ensure_ascii=False)
        if "only releases with status draft" in message and "draft app" in message:
            raise PlayError(f"초기 앱 게시 설정을 Play Console에서 완료해야 합니다. 초안으로 자동 재시도하지 않습니다. ({diagnostic})") from None
        if error.code == 401:
            raise PlayError(f"Google Play 인증 실패. OAuth access token을 다시 발급하십시오. ({diagnostic})") from None
        if error.code == 403:
            raise PlayError(f"Google Play 권한 오류. 앱의 테스트 출시 권한과 API 활성화를 확인하십시오. ({diagnostic})") from None
        if "changes_already_in_review" in message:
            raise PlayError(f"이미 진행 중인 심사가 있습니다. 기존 심사를 취소하지 않고 게시를 중단했습니다. ({diagnostic})") from None
        raise PlayError(f"Google Play 요청 실패 ({diagnostic}).",
                        uncertain=error.code >= 500 or error.code == 408) from None
    except (OSError, ValueError):
        raise PlayError("Google Play 통신 또는 응답 형식 오류입니다.", uncertain=True) from None


def check_versions(version, digest, tracks, bundles, apks):
    try:
        codes = [int(item["versionCode"]) for item in bundles + apks]
        codes += [int(code) for track in tracks for release in track.get("releases", [])
                  for code in release.get("versionCodes", [])]
        matching = [bundle for bundle in bundles if int(bundle["versionCode"]) == version]
    except (KeyError, TypeError, ValueError):
        raise PlayError("Google Play의 기존 버전 정보를 확인할 수 없습니다.") from None
    if version < max(codes, default=0) or (version in codes and not matching):
        raise PlayError("이미 사용 중이거나 더 높은 versionCode가 있습니다. 새 코드로 다시 빌드하십시오.")
    if matching and (len(matching) != 1 or matching[0].get("sha256", "").lower() != digest):
        raise PlayError("기존 versionCode의 AAB SHA-256이 일치하지 않습니다.")
    return bool(matching)


def release_state(release):
    value = release.get("releaseLifecycleState", "")
    return value[len(STATE_PREFIX):] if value.startswith(STATE_PREFIX) else ""


def verified_result(token, args):
    path = f"{BASE}/tracks/{urllib.parse.quote(args.track, safe='')}/releases"
    response = request(token, "GET", path)
    matches = [release for release in response.get("releases", []) if any(
        str(artifact.get("versionCode")) == str(args.version_code)
        for artifact in release.get("activeArtifacts", []))]
    states = {release_state(release) for release in matches}
    if len(states) != 1 or not states.issubset(STATES):
        raise PlayError("커밋 결과 미확정: 새 버전의 실제 출시 상태를 확인할 수 없습니다.", uncertain=True)
    state = states.pop()
    return {"status": STATES[state][0], "version_code": args.version_code, "track": args.track,
            "target": args.target,
            "lifecycle_state": STATE_PREFIX + state, "available_to_testers": state == "PUBLISHED"}


def verify_after_commit(token, args):
    for attempt in range(3):
        if attempt:
            time.sleep(attempt)
        try:
            return verified_result(token, args)
        except (PlayError, AttributeError, KeyError, TypeError, ValueError):
            pass
    raise PlayError("게시 처리 결과 미확정: Play Console에서 해당 버전의 출시 상태를 확인하십시오.", uncertain=True)


def publish(args, token, data, digest, notes):
    edit_path = None
    commit_attempted = False
    try:
        edit = request(token, "POST", f"{BASE}/edits", payload={})
        edit_id = edit.get("id", "")
        if not isinstance(edit_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", edit_id):
            raise PlayError("생성한 Google Play edit ID를 확인할 수 없습니다.")
        edit_path = f"{BASE}/edits/{edit_id}"
        tracks = request(token, "GET", f"{edit_path}/tracks").get("tracks", [])
        targets = [track for track in tracks if track.get("track") == args.track]
        if len(targets) != 1:
            raise PlayError("설정한 기존 테스트 트랙을 찾을 수 없습니다.")
        if any(release.get("status") != "completed" for release in targets[0].get("releases", [])):
            raise PlayError("대상 트랙에 미완료 출시가 있어 기존 초안을 보호하기 위해 중단했습니다.")
        bundles = request(token, "GET", f"{edit_path}/bundles").get("bundles", [])
        apks = request(token, "GET", f"{edit_path}/apks").get("apks", [])
        exists = check_versions(args.version_code, digest, tracks, bundles, apks)
        for track in tracks:
            track_id = urllib.parse.quote(track["track"], safe="")
            pending = request(token, "GET", f"{BASE}/tracks/{track_id}/releases")
            allowed = {"PUBLISHED"} if track["track"] == args.track else {"DRAFT", "PUBLISHED"}
            if any(release_state(release) not in allowed
                   for release in pending.get("releases", [])):
                raise PlayError("기존 심사·게시 대기 변경이 있어 자동 게시를 중단했습니다.")
        if not exists:
            uploaded = request(token, "POST", f"/upload{edit_path}/bundles?uploadType=media", media=data)
            if uploaded.get("versionCode") != args.version_code or uploaded.get("sha256", "").lower() != digest:
                raise PlayError("업로드한 AAB의 versionCode 또는 SHA-256이 일치하지 않습니다.")
        body = {"track": args.track, "releases": [{"name": args.release_name,
                "versionCodes": [str(args.version_code)], "status": args.status,
                "releaseNotes": [{"language": "ko-KR", "text": notes}]}]}
        target_path = f"{edit_path}/tracks/{urllib.parse.quote(args.track, safe='')}"
        request(token, "PUT", target_path, payload=body)
        request(token, "POST", f"{edit_path}:validate")
        query = urllib.parse.urlencode({"changesInReviewBehavior": "ERROR_IF_IN_REVIEW",
                                       "changesNotSentForReview": str(not args.send_for_review).lower()})
        commit_attempted = True
        try:
            request(token, "POST", f"{edit_path}:commit?{query}")
        except PlayError as error:
            if not error.uncertain:
                raise
        return verify_after_commit(token, args)
    except PlayError as error:
        if not commit_attempted:
            error.uncertain = False
        raise
    finally:
        if edit_path and not commit_attempted:
            try:
                request(token, "DELETE", edit_path)
            except PlayError:
                pass


def report(result):
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            for key, value in result.items():
                handle.write(f"{key}={str(value).lower() if isinstance(value, bool) else value}\n")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        label = next((label for status, label in STATES.values() if status == result["status"]),
                     "게시 처리 결과 미확정 · Play Console 확인 필요")
        with open(summary, "a", encoding="utf-8") as handle:
            target_label = "내부 테스트" if result["target"] == "internal" else "비공개 테스트"
            handle.write(f"Google Play {target_label}: {label}\n\n"
                         f"- 트랙: `{result['track']}`\n- versionCode: `{result['version_code']}`\n")


def main(argv=None):
    args = arguments(argv)
    try:
        token = os.environ.get("PLAY_ACCESS_TOKEN", "").strip()
        data, digest, notes = read_inputs(args, token)
        result = publish(args, token, data, digest, notes)
        report(result)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except PlayError as error:
        if error.uncertain:
            report({"status": "uncertain", "version_code": args.version_code,
                    "track": args.track, "target": args.target, "available_to_testers": False})
        print(str(error), file=sys.stderr)
    except Exception:
        print("게시 처리를 완료하지 못했습니다. 입력 파일과 실행 설정을 확인하십시오.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
