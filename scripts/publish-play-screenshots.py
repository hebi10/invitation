#!/usr/bin/env python3
"""Safely publish Invitation Korean phone screenshots via Google Play edits.images."""

import argparse
import base64
import binascii
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

PACKAGE = "kr.msgnote.mobileinvitation"
LANGUAGE = "ko-KR"
IMAGE_TYPE = "phoneScreenshots"
ROOT = f"/androidpublisher/v3/applications/{PACKAGE}"
ENDPOINT = "https://androidpublisher.googleapis.com"
EXPECTED_NAMES = (
    "invitation-phone-01-overview-1080x1920.png",
    "invitation-phone-02-themes-1080x1920.png",
    "invitation-phone-03-create-1080x1920.png",
    "invitation-phone-04-media-1080x1920.png",
    "invitation-phone-05-venue-1080x1920.png",
    "invitation-phone-06-preview-1080x1920.png",
    "invitation-phone-07-share-1080x1920.png",
    "invitation-phone-08-manage-1080x1920.png",
)


def assets(root):
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    if len(manifest.get("assets", [])) != 8:
        raise ValueError("Exactly eight approved screenshot assets are required")
    results = []
    for index, (name, record) in enumerate(zip(EXPECTED_NAMES, manifest["assets"]), 1):
        if record.get("index") != index or record.get("file") != name:
            raise ValueError(f"Unexpected screenshot file order: {index}")
        path = root / name
        data = path.read_bytes()
        if len(data) < 100 or len(data) > 8_000_000:
            raise ValueError(f"Unexpected PNG file size: {name}")
        if not data.startswith(b"\x89PNG\r\n\x1a\n") or data[12:16] != b"IHDR":
            raise ValueError(f"Invalid PNG: {name}")
        width, height = int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
        if (width, height) != (1080, 1920) or data[24] != 8 or data[25] != 2:
            raise ValueError(f"Incorrect PNG dimensions/color depth: {name}")
        sha = hashlib.sha256(data).hexdigest()
        if sha != record.get("sha256") or len(data) != record.get("size_bytes"):
            raise ValueError(f"Screenshot hash/size mismatch: {name}")
        results.append((name, data, sha))
    if len(set(item[2] for item in results)) != 8:
        raise ValueError("Duplicate screenshot image detected")
    return results


def sha_matches(actual, expected):
    if not actual:
        return False
    actual = actual.strip()
    if re.fullmatch(r"[0-9a-fA-F]{64}", actual):
        return actual.lower() == expected
    try:
        return base64.b64decode(actual + "===", validate=False).hex() == expected
    except (ValueError, binascii.Error):
        return False


def request(token, method, path, *, data=None, mime=None, params=None, timeout=90):
    if params:
        path += "?" + urllib.parse.urlencode(params)
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    if mime:
        headers["Content-Type"] = mime
    if data is not None and mime == "application/json":
        data = json.dumps(data).encode("utf-8")
    url = ENDPOINT + path
    req = urllib.request.Request(url, method=method, headers=headers, data=data)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            body = response.read(2_000_000)
        result = json.loads(body) if body else {}
        if not isinstance(result, dict):
            raise ValueError("Malformed Play JSON response")
        return result
    except urllib.error.HTTPError as e:
        code = e.code
        status, reason, explanation = "UNKNOWN", "UNKNOWN", ""
        try:
            payload = json.loads(e.read(8192).decode("utf-8", "replace"))
            detail = payload.get("error", {}) if isinstance(payload, dict) else {}
            candidate = detail.get("status", "")
            if isinstance(candidate, str) and re.fullmatch(r"[A-Z_]{2,60}", candidate):
                status = candidate
            reasons = detail.get("errors", [])
            if isinstance(reasons, list) and reasons and isinstance(reasons[0], dict):
                candidate = reasons[0].get("reason", "")
                if isinstance(candidate, str) and re.fullmatch(r"[A-Za-z_]{2,80}", candidate):
                    reason = candidate
            for entry in detail.get("details", []) if isinstance(detail.get("details"), list) else []:
                if isinstance(entry, dict) and reason == "UNKNOWN":
                    candidate = entry.get("reason", "")
                    if isinstance(candidate, str) and re.fullmatch(r"[A-Z_]{2,80}", candidate):
                        reason = candidate
            explanation = detail.get("message", "")
            if isinstance(explanation, str):
                explanation = " ".join(explanation.split())[:360]
                explanation = re.sub(r"https?://[^\\s]+", "[url]", explanation)
                explanation = re.sub(r"[\\w.+-]+@[\\w.-]+", "[email]", explanation)
                if re.search(r"(?i)(bearer|token|password|secret|private.?key|credential|authorization|api.?key)", explanation):
                    explanation = "[redacted]"
                explanation = explanation.replace("::", ":").replace("\\r", " ").replace("\\n", " ")
            else:
                explanation = ""
        except (ValueError, UnicodeError, OSError):
            explanation = ""
        finally:
            e.close()
        operation = path.partition("?")[0].split("/")[-1]
        if operation.endswith(":validate"):
            operation = "edits.validate"
        elif operation.endswith(":commit"):
            operation = "edits.commit"
        else:
            operation = f"{method} Play resource"
        raise RuntimeError(f"Google Play {operation} failed: HTTP {code} / {status} / {reason}; message={explanation[:240] or 'unavailable'}") from None
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise RuntimeError("Google Play connection or response could not be verified") from None


def write_report(report):
    output = Path("artifacts/play-store-screenshots/report.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in {"previous_images", "new_images"}}, ensure_ascii=False))
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write("Invitation Google Play 한국어 휴대전화 설명 이미지\n\n")
            f.write(f"- 상태: {report['status']}\n- 기존 이미지: {len(report.get('previous_images', []))}장\n")
            f.write(f"- 신규 이미지: {len(report.get('new_images', []))}장\n")
            f.write(f"- 대상: `{LANGUAGE}` / `{IMAGE_TYPE}`\n- 앱: `{PACKAGE}`\n")


def publish(files):
    token = os.environ.get("PLAY_ACCESS_TOKEN", "")
    if not token or "\n" in token or "\r" in token:
        raise ValueError("Missing protected Google Play short-lived access token")
    report = {"package": PACKAGE, "language": LANGUAGE, "imageType": IMAGE_TYPE,
              "sourceSha": os.environ.get("GITHUB_SHA", ""), "status": "preflight", "committed": False}
    edit_path = None
    commit_attempted = False
    try:
        created = request(token, "POST", ROOT + "/edits", data={}, mime="application/json")
        edit_id = created.get("id", "")
        if not isinstance(edit_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", edit_id):
            raise RuntimeError("Play did not issue a valid edit ID")
        edit_path = ROOT + "/edits/" + edit_id
        listings = request(token, "GET", edit_path + "/listings").get("listings", [])
        if not isinstance(listings, list) or LANGUAGE not in [x.get("language") for x in listings]:
            raise RuntimeError("The ko-KR Play listing does not exist; no changes were made")
        images_path = edit_path + f"/listings/{LANGUAGE}/{IMAGE_TYPE}"
        existing = request(token, "GET", images_path).get("images", [])
        if not isinstance(existing, list):
            raise RuntimeError("Existing store screenshot data is malformed")
        report["previous_images"] = [{"id": x.get("id"), "sha256": x.get("sha256")}
                                     for x in existing]
        hashes = [x.get("sha256", "") for x in existing]
        if len(existing) == 8 and all(sha_matches(h, files[i][2]) for i, h in enumerate(hashes)):
            report.update(status="already_up_to_date", new_images=report["previous_images"])
            write_report(report)
            return
        if len(existing) > 8:
            raise RuntimeError("Unexpected number of existing screenshots; refusing to overwrite")
        request(token, "DELETE", images_path)
        sent = []
        for index, (name, data, sha) in enumerate(files, 1):
            result = request(token, "POST", "/upload" + images_path,
                             data=data, mime="image/png", params={"uploadType": "media"}, timeout=150)
            image = result.get("image") or result
            if not isinstance(image, dict) or not image.get("id"):
                raise RuntimeError("Google Play upload did not return an image ID")
            if image.get("sha256") and not sha_matches(image["sha256"], sha):
                raise RuntimeError("Google Play screenshot hash mismatch")
            sent.append({"index": index, "name": name, "id": image["id"], "sha256": sha})
        staged = request(token, "GET", images_path).get("images", [])
        if len(staged) != 8 or [x.get("id") for x in staged] != [x["id"] for x in sent]:
            raise RuntimeError("Google Play staged screenshot order/quantity could not be verified")
        report.update(status="staged_not_committed", new_images=sent)
        request(token, "POST", edit_path + ":validate", data={}, mime="application/json")
        report.update(status="commit_attempted")
        commit_attempted = True
        request(token, "POST", edit_path + ":commit", data={}, mime="application/json", params={"changesInReviewBehavior": "ERROR_IF_IN_REVIEW"})
        report.update(status="submitted_for_review_or_publication", committed=True)
        write_report(report)
    except Exception:
        report["status"] = "commit_state_uncertain" if commit_attempted else "not_committed"
        write_report(report)
        raise
    finally:
        if edit_path and not commit_attempted:
            try:
                request(token, "DELETE", edit_path)
            except Exception:
                pass


def main():
    cli = argparse.ArgumentParser()
    cli.add_argument("--assets", type=Path, default=Path("store-assets/invitation/ko-KR"))
    cli.add_argument("--publish", action="store_true")
    args = cli.parse_args()
    try:
        files = assets(args.assets)
        if args.publish:
            publish(files)
        else:
            print("PASS: eight validated 1080x1920 RGB PNG files with distinct SHA-256 digests")
    except Exception as e:
        print(str(e), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
