#!/usr/bin/env python3
"""Synchronize only the ko-KR high-res Play listing icon for Invitation."""

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import sys
import urllib.error
import urllib.parse
import urllib.request

PACKAGE = "kr.msgnote.mobileinvitation"
LANGUAGE = "ko-KR"
IMAGE_TYPE = "icon"
API = "https://androidpublisher.googleapis.com"
BASE = f"{API}/androidpublisher/v3/applications/{PACKAGE}"
ICON = Path("apps/mobile/store/icon.png")
# Immutable reviewed source; changing the asset requires deliberate script review.
EXPECTED_BLOB_SHA = "73929f4a16f1c55183a2e20f77993b167693f86d"


class IconSyncError(Exception):
    pass


def validate_icon():
    image = ICON.read_bytes()
    if not 1 <= len(image) <= 1024 * 1024:
        raise IconSyncError("Play 스토어 아이콘의 용량은 1MB 이하여야 합니다.")
    if image[:8] != b"\x89PNG\r\n\x1a\n" or image[12:16] != b"IHDR":
        raise IconSyncError("512x512 PNG 이미지가 필요합니다.")
    width, height, depth, color = struct.unpack(">IIBB", image[16:26])
    if (width, height, depth, color) != (512, 512, 8, 6):
        raise IconSyncError("스토어 아이콘은 512x512 32비트 RGBA PNG여야 합니다.")
    blob = hashlib.sha1(f"blob {len(image)}\0".encode() + image).hexdigest()
    if blob != EXPECTED_BLOB_SHA:
        raise IconSyncError("아이콘 원본 SHA가 확인한 소스와 일치하지 않습니다.")
    digest = hashlib.sha256(image).digest()
    return image, digest, hashlib.sha256(image).hexdigest()


def remote_matches(remote, digest):
    if not isinstance(remote, dict):
        return False
    value = remote.get("sha256", "")
    return isinstance(value, str) and value in {
        digest.hex(), digest.hex().upper(),
        base64.b64encode(digest).decode("ascii"),
        base64.urlsafe_b64encode(digest).decode("ascii").rstrip("="),
    }


def request(token, method, url, body=None, content_type=None):
    headers = {"Authorization": "Bearer " + token}
    if body is not None:
        headers["Content-Type"] = content_type or "application/json; charset=utf-8"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=70) as response:
            payload = response.read()
        return json.loads(payload) if payload else {}
    except urllib.error.HTTPError as error:
        code = error.code
        try:
            payload = json.loads(error.read(4096).decode("utf-8", "replace"))
        except (ValueError, OSError):
            payload = {}
        finally:
            error.close()
        status = payload.get("error", {}).get("status", "") if isinstance(payload, dict) else ""
        if not re.fullmatch(r"[A-Z_]{2,40}", status):
            status = "UNKNOWN"
        if code == 403:
            raise IconSyncError(
                "Google Play HTTP 403: 전용 배포 계정에 이 앱의 '스토어 등록정보 관리' 권한이 필요합니다."
            ) from None
        if code == 401:
            raise IconSyncError("Google Play HTTP 401: 액세스 토큰 인증에 실패했습니다.") from None
        if code == 400 and status == "FAILED_PRECONDITION":
            raise IconSyncError(
                "Google Play 심사 중 변경사항이 있어 기존 심사를 취소하지 않고 중단했습니다."
            ) from None
        raise IconSyncError(f"Google Play API HTTP {code} / {status}; 변경 상태를 확인하세요.") from None
    except (TimeoutError, OSError, ValueError):
        raise IconSyncError("Google Play 통신 결과가 불확실합니다. 같은 변경을 무조건 재시도하지 마세요.") from None


def json_post(token, url):
    return request(token, "POST", url, b"{}", "application/json; charset=utf-8")


def create_edit(token):
    result = json_post(token, BASE + "/edits")
    edit_id = result.get("id", "")
    if not isinstance(edit_id, str) or not re.fullmatch(r"[a-zA-Z0-9_-]+", edit_id):
        raise IconSyncError("Google Play edit ID 검증 실패")
    return BASE + "/edits/" + edit_id


def list_icons(token, edit_path):
    uri = f"{edit_path}/listings/{LANGUAGE}/{IMAGE_TYPE}"
    result = request(token, "GET", uri)
    items = result.get("images", [])
    if not isinstance(items, list):
        raise IconSyncError("등록된 이미지 목록 형식을 확인할 수 없습니다.")
    return items


def report(message):
    print(message)
    summary = os.environ.get("GITHUB_STEP_SUMMARY", "")
    if summary:
        with open(summary, "a", encoding="utf-8") as stream:
            stream.write("## 모바일 청첩장 Play 아이콘 확인\n\n" + message + "\n")


def sync(token, apply, image, digest):
    edit = None
    commit_attempted = False
    try:
        edit = create_edit(token)
        listing = request(token, "GET", edit + "/listings/" + LANGUAGE)
        if not listing or listing.get("language") != LANGUAGE:
            raise IconSyncError("ko-KR 스토어 등록정보가 존재하는지 확인할 수 없습니다.")
        before = list_icons(token, edit)
        if len(before) == 1 and remote_matches(before[0], digest):
            report("동일한 아이콘 SHA-256이 이미 등록되어 있습니다. 변경 없이 종료했습니다.")
            return
        if not apply:
            report(f"아이콘 변경 필요: 기존 {len(before)}개. 읽기 전용 확인이며 업로드는 하지 않았습니다.")
            return

        # The edit is a temporary transaction; live data changes only after commit.
        target = f"{edit}/listings/{LANGUAGE}/{IMAGE_TYPE}"
        request(token, "DELETE", target)
        upload = request(
            token, "POST",
            API + "/upload" + target.removeprefix(API) + "?uploadType=media",
            image, "image/png",
        )
        new_icon = upload.get("image") if isinstance(upload, dict) else None
        if not isinstance(new_icon, dict) or not new_icon.get("id"):
            raise IconSyncError("Google Play 아이콘 업로드 확인에 실패했습니다.")
        after = list_icons(token, edit)
        if len(after) != 1 or after[0].get("id") != new_icon["id"]:
            raise IconSyncError("교체된 이미지 목록이 예상과 다릅니다. 변경을 적용하지 않았습니다.")
        if new_icon.get("sha256") and not remote_matches(new_icon, digest):
            raise IconSyncError("아이콘 해시가 기대와 달라 적용하지 않았습니다.")
        json_post(token, edit + ":validate")
        query = urllib.parse.urlencode({"changesInReviewBehavior": "ERROR_IF_IN_REVIEW"})
        commit_attempted = True
        json_post(token, edit + ":commit?" + query)
        report("새 ko-KR 아이콘 변경이 Google Play에 커밋되었습니다. 공개 반영 및 심사 상태는 Play Console에서 별도 확인해야 합니다.")
    finally:
        if edit and not commit_attempted:
            try:
                request(token, "DELETE", edit)
            except IconSyncError:
                pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    token = os.environ.get("PLAY_ACCESS_TOKEN", "").strip()
    if not token or "\n" in token or "\r" in token:
        raise IconSyncError("인증 토큰이 설정되지 않았습니다.")
    image, digest, hex_digest = validate_icon()
    print(f"검증된 ko-KR 아이콘: 512x512 RGBA, SHA-256 {hex_digest[:12]}..., 적용: {args.apply}")
    sync(token, args.apply, image, digest)


if __name__ == "__main__":
    try:
        main()
    except (IconSyncError, OSError) as error:
        print(f"::error::{error}", file=sys.stderr)
        raise SystemExit(1)
