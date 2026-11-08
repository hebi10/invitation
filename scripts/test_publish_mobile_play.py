import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlsplit
import zipfile


SCRIPT = Path(__file__).with_name("publish-mobile-play.py")
PACKAGE = "kr.msgnote.mobileinvitation"
BASE = f"/androidpublisher/v3/applications/{PACKAGE}"
EDIT = f"{BASE}/edits/our-edit"
TOKEN = "private-token-never-expose"
TRACKS = [{"track": "production"}, {"track": "internal", "releases": [
    {"name": "unrelated draft", "versionCodes": ["10"], "status": "draft"}
]}, {"track": "closed-team"}]


class Reply(io.BytesIO):
    def __init__(self, value):
        super().__init__(json.dumps(value).encode())


class PlayHTTP:
    def __init__(self, steps):
        self.steps = list(steps)
        self.requests = []
        self.failures = []

    def __call__(self, request, timeout=None):
        actual = (request.method, urlsplit(request.full_url).path,
                  urlsplit(request.full_url).query, request.data)
        self.requests.append(actual)
        if not self.steps:
            self.failures.append(f"Unexpected HTTP request: {actual[:3]}")
            raise AssertionError(f"Unexpected HTTP request: {actual[:3]}")
        method, path, value = self.steps.pop(0)
        if actual[:2] != (method, path):
            self.failures.append(f"Expected {(method, path)}, got {actual[:2]}")
            raise AssertionError(f"Expected {(method, path)}, got {actual[:2]}")
        if request.get_header("Authorization") != f"Bearer {TOKEN}":
            self.failures.append("Incorrect OAuth access token header")
            raise AssertionError("OAuth access token was not passed correctly")
        if isinstance(value, Exception):
            raise value
        return Reply(value)


class PublisherTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(SCRIPT.is_file(), "The safe Play publisher is not implemented yet")
        spec = importlib.util.spec_from_file_location("play_publisher", SCRIPT)
        self.publisher = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.publisher)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.aab = self.directory / "app.aab"
        with zipfile.ZipFile(self.aab, "w") as archive:
            archive.writestr("BundleConfig.pb", b"bundle-config")
            archive.writestr("base/manifest/AndroidManifest.xml", b"protobuf-manifest")
        self.digest = hashlib.sha256(self.aab.read_bytes()).hexdigest()
        self.notes = self.directory / "notes.txt"
        self.notes.write_text("초대장 개선\n안정성 수정", encoding="utf-8")
        self.output = self.directory / "output"
        self.summary = self.directory / "summary"
        self.argv = ["--aab", str(self.aab), "--version-code", "11", "--track",
                     "closed-team", "--release-name", "1.0.5 (11)",
                     "--notes-file", str(self.notes), "--target", "closed", "--status", "completed"]

    def bundle(self, version=11, sha=None):
        return {"versionCode": version, "sha256": self.digest if sha is None else sha}

    def releases(self, lifecycle="PUBLISHED", version=11, track="closed-team"):
        return {"releases": [{"releaseName": "1.0.5 (11)", "track": track,
                              "activeArtifacts": [{"versionCode": version}],
                              "releaseLifecycleState": f"RELEASE_LIFECYCLE_STATE_{lifecycle}"}]}

    def preflight(self, tracks=None, bundles=None, apks=None, pending=None):
        tracks = TRACKS if tracks is None else tracks
        return [("POST", f"{BASE}/edits", {"id": "our-edit", "expiryTimeSeconds": "1999999999"}),
                ("GET", f"{EDIT}/tracks", {"tracks": tracks}),
                ("GET", f"{EDIT}/bundles", {"bundles": bundles or []}),
                ("GET", f"{EDIT}/apks", {"apks": apks or []})] + [
                    ("GET", f"{BASE}/tracks/{track['track']}/releases",
                     (pending or {}).get(track["track"], {"releases": []})) for track in tracks]

    def finish(self, lifecycle="PUBLISHED", upload=True, commit=None, track="closed-team"):
        steps = []
        if upload:
            steps.append(("POST", "/upload" + EDIT + "/bundles", self.bundle()))
        steps += [("PUT", f"{EDIT}/tracks/{track}", {}),
                  ("POST", f"{EDIT}:validate", {"id": "our-edit"}),
                  ("POST", f"{EDIT}:commit", commit or {"id": "our-edit"}),
                  ("GET", f"{BASE}/tracks/{track}/releases", self.releases(lifecycle, track=track))]
        return steps

    def run_main(self, steps, argv=None, token=TOKEN):
        http = PlayHTTP(steps)
        stdout, stderr = io.StringIO(), io.StringIO()
        env = {"PLAY_ACCESS_TOKEN": token, "GITHUB_OUTPUT": str(self.output),
               "GITHUB_STEP_SUMMARY": str(self.summary)}
        with patch.dict(os.environ, env), patch("urllib.request.urlopen", http), \
                patch("time.sleep"), \
                contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            try:
                result = self.publisher.main(self.argv if argv is None else argv)
            except SystemExit as error:
                result = error.code
        self.assertEqual(http.steps, [], "A required request was not performed")
        self.assertEqual(http.failures, [], "The publisher emitted an unsafe or unexpected HTTP request")
        for output in (stdout.getvalue(), stderr.getvalue(),
                       self.output.read_text() if self.output.exists() else "",
                       self.summary.read_text() if self.summary.exists() else ""):
            self.assertNotIn(TOKEN, output)
        return result, http.requests, stdout.getvalue(), stderr.getvalue()

    def test_full_completed_contract_keeps_other_draft_and_verifies_publication(self):
        result, calls, stdout, _ = self.run_main(self.preflight() + self.finish())
        self.assertEqual(result, 0)
        self.assertEqual(json.loads(stdout)["status"], "published")
        self.assertTrue(json.loads(stdout)["available_to_testers"])
        self.assertEqual(json.loads(stdout)["target"], "closed")
        upload = next(call for call in calls if call[1].startswith("/upload"))
        self.assertEqual(upload[2], "uploadType=media")
        self.assertEqual(upload[3], self.aab.read_bytes())
        update = json.loads(next(call[3] for call in calls if call[0] == "PUT"))
        self.assertEqual(update, {"track": "closed-team", "releases": [{
            "name": "1.0.5 (11)", "versionCodes": ["11"], "status": "completed",
            "releaseNotes": [{"language": "ko-KR", "text": "초대장 개선\n안정성 수정"}]}]})
        commit = next(call for call in calls if call[1].endswith(":commit"))
        self.assertIn("changesNotSentForReview=true", commit[2])
        self.assertIn("changesInReviewBehavior=ERROR_IF_IN_REVIEW", commit[2])
        self.assertIsNone(commit[3])
        self.assertIn("status=published\n", self.output.read_text())
        self.assertIn("테스터 제공 중", self.summary.read_text())
        self.assertIn("Google Play 비공개 테스트", self.summary.read_text())

    def test_internal_default_and_explicit_target_publish_only_to_internal(self):
        tracks = [{"track": "production"}, {"track": "internal", "releases": [
            {"versionCodes": ["10"], "status": "completed"}]},
            {"track": "closed-team", "releases": [
                {"versionCodes": ["10"], "status": "draft"}]}]
        for explicit in [False, True]:
            with self.subTest(explicit=explicit):
                argv = self.argv.copy()
                argv[argv.index("--track") + 1] = "internal"
                if explicit:
                    argv[argv.index("--target") + 1] = "internal"
                else:
                    index = argv.index("--target")
                    del argv[index:index + 2]
                result, calls, stdout, _ = self.run_main(
                    self.preflight(tracks=tracks) + self.finish(track="internal"), argv)
                self.assertEqual(result, 0)
                self.assertEqual(json.loads(stdout), {
                    "status": "published", "version_code": 11, "track": "internal",
                    "target": "internal", "lifecycle_state": "RELEASE_LIFECYCLE_STATE_PUBLISHED",
                    "available_to_testers": True})
                update = json.loads(next(call[3] for call in calls if call[0] == "PUT"))
                self.assertEqual(update["track"], "internal")
                commit = next(call for call in calls if call[1].endswith(":commit"))
                self.assertIn("changesInReviewBehavior=ERROR_IF_IN_REVIEW", commit[2])
                self.assertIn("changesNotSentForReview=true", commit[2])
                self.assertIn("target=internal\n", self.output.read_text())
                self.assertIn("Google Play 내부 테스트", self.summary.read_text())

    def test_internal_target_requires_exact_internal_track_before_http(self):
        for track in ["closed-team", "production", "beta", "internalsharing", "qa",
                      "INTERNAL", "Internal", "wear:internal", "internal ", " internal",
                      "internal/", "internal%00", "internal\nstatus=ok"]:
            with self.subTest(track=track):
                argv = self.argv.copy()
                argv[argv.index("--track") + 1] = track
                argv[argv.index("--target") + 1] = "internal"
                result, calls, _, _ = self.run_main([], argv)
                self.assertEqual(result, 1)
                self.assertEqual(calls, [])

    def test_omitted_target_never_selects_a_closed_track_before_http(self):
        argv = self.argv.copy()
        index = argv.index("--target")
        del argv[index:index + 2]
        result, calls, _, _ = self.run_main([], argv)
        self.assertEqual(result, 1)
        self.assertEqual(calls, [])

    def test_internal_target_existing_draft_is_protected_in_edit_and_lifecycle(self):
        argv = self.argv.copy()
        argv[argv.index("--track") + 1] = "internal"
        argv[argv.index("--target") + 1] = "internal"
        for source in ["edit", "lifecycle"]:
            with self.subTest(source=source):
                if source == "edit":
                    tracks = [{"track": "internal", "releases": [{
                        "name": "someone else", "versionCodes": ["10"], "status": "draft"}]}]
                    steps = self.preflight(tracks=tracks)[:2]
                else:
                    steps = self.preflight(tracks=[{"track": "internal"}], pending={
                        "internal": self.releases("DRAFT", version=10, track="internal")})
                result, calls, _, _ = self.run_main(steps + [("DELETE", EDIT, {})], argv)
                self.assertEqual(result, 1)
                self.assertFalse(any(call[0] == "PUT" or call[1].startswith("/upload") for call in calls))

    def test_internal_uncertain_commit_uses_only_read_verification(self):
        argv = self.argv.copy()
        argv[argv.index("--track") + 1] = "internal"
        argv[argv.index("--target") + 1] = "internal"
        steps = self.preflight(tracks=[{"track": "internal"}]) + self.finish(
            track="internal", commit=URLError(TOKEN))[:-1] + [
            ("GET", f"{BASE}/tracks/internal/releases", {"releases": []})] * 3
        result, calls, _, stderr = self.run_main(steps, argv)
        self.assertEqual(result, 1)
        self.assertIn("미확정", stderr)
        self.assertIn("target=internal\n", self.output.read_text())
        self.assertEqual(sum(call[1].endswith(":commit") for call in calls), 1)
        self.assertEqual([call[0] for call in calls[-3:]], ["GET", "GET", "GET"])
        self.assertFalse(any(call[0] == "DELETE" for call in calls))

    def test_explicit_review_submission_omits_hold_flag_and_reports_in_review(self):
        result, calls, stdout, _ = self.run_main(self.preflight() + self.finish("IN_REVIEW"),
                                                self.argv + ["--send-for-review"])
        self.assertEqual(result, 0)
        self.assertFalse(json.loads(stdout)["available_to_testers"])
        self.assertEqual(json.loads(stdout)["status"], "in_review")
        self.assertEqual(parse_qs(next(c[2] for c in calls if c[1].endswith(":commit"))),
                         {"changesInReviewBehavior": ["ERROR_IF_IN_REVIEW"]})

    def test_internal_explicit_review_omits_unsupported_query_parameter(self):
        argv = self.argv + ["--send-for-review"]
        argv[argv.index("--target") + 1] = "internal"
        argv[argv.index("--track") + 1] = "internal"
        result, calls, stdout, _ = self.run_main(self.preflight(tracks=[{"track": "internal"}]) + self.finish(track="internal"), argv)
        self.assertEqual(result, 0)
        self.assertTrue(json.loads(stdout)["available_to_testers"])
        self.assertEqual(parse_qs(next(c[2] for c in calls if c[1].endswith(":commit"))),
                         {"changesInReviewBehavior": ["ERROR_IF_IN_REVIEW"]})

    def test_automatic_review_rejection_does_not_override_explicit_hold(self):
        body = b'{"error":{"code":400,"status":"INVALID_ARGUMENT","message":"Changes are sent for review automatically. The query parameter changesNotSentForReview must not be set."}}'
        error = HTTPError("https://example.invalid", 400, TOKEN, {}, io.BytesIO(body))
        result, calls, _, stderr = self.run_main(self.preflight() + self.finish(commit=error)[:-1])
        self.assertEqual(result, 1)
        self.assertIn("changesNotSentForReview must not be set", stderr)
        commit = [call for call in calls if call[1].endswith(":commit")]
        self.assertEqual(len(commit), 1)
        self.assertEqual(parse_qs(commit[0][2]), {"changesInReviewBehavior": ["ERROR_IF_IN_REVIEW"],
                                               "changesNotSentForReview": ["true"]})
        self.assertFalse(any(call[0] == "DELETE" for call in calls))

    def test_alpha_old_draft_can_be_superseded_only_on_explicit_closed_request(self):
        tracks = [{"track": "internal", "releases": [{"versionCodes": ["10"], "status": "completed"}]},
                  {"track": "alpha", "releases": [
                      {"name": "old unpublished test", "versionCodes": ["3", "4"], "status": "draft"}]}]
        argv = self.argv.copy()
        argv[argv.index("--track") + 1] = "alpha"
        argv += ["--send-for-review", "--replace-existing-alpha-draft"]
        steps = self.preflight(tracks=tracks, pending={
            "alpha": self.releases("DRAFT", version=4, track="alpha")
        }) + self.finish(track="alpha")
        result, calls, stdout, _ = self.run_main(steps, argv)
        self.assertEqual(result, 0)
        self.assertEqual(json.loads(stdout)["track"], "alpha")
        self.assertTrue(json.loads(stdout)["available_to_testers"])
        self.assertEqual([c for c in calls if c[0] == "PUT" and c[1].endswith("/tracks/alpha")].__len__(), 1)
        self.assertEqual(json.loads(next(c[3] for c in calls if c[0] == "PUT"))["releases"][0]["versionCodes"], ["11"])
        self.assertFalse(any(c[0] == "PUT" and c[1].endswith("/tracks/internal") for c in calls))

    def test_alpha_draft_replacement_never_overrides_other_pending_or_newer_releases(self):
        argv = self.argv.copy()
        argv[argv.index("--track") + 1] = "alpha"
        argv.append("--replace-existing-alpha-draft")
        cases = [
            [{"versionCodes": ["12"], "status": "draft"}],
            [{"versionCodes": ["10"], "status": "inProgress"}],
            [{"versionCodes": ["10"], "status": "draft"}, {"versionCodes": ["9"], "status": "completed"}],
            [{"versionCodes": ["x"], "status": "draft"}],
            [{"versionCodes": [], "status": "draft"}],
        ]
        for releases in cases:
            with self.subTest(releases=releases):
                tracks = [{"track": "alpha", "releases": releases}]
                result, calls, _, _ = self.run_main(self.preflight(tracks=tracks)[:2] + [("DELETE", EDIT, {})], argv)
                self.assertEqual(result, 1)
                self.assertFalse(any(c[0] == "PUT" or c[1].startswith("/upload") for c in calls))
        steps = self.preflight(tracks=[{"track": "alpha", "releases": [
            {"versionCodes": ["3", "4"], "status": "draft"}]}], pending={
            "alpha": self.releases("IN_REVIEW", version=4, track="alpha")
        }) + [("DELETE", EDIT, {})]
        result, calls, _, _ = self.run_main(steps, argv)
        self.assertEqual(result, 1)
        self.assertFalse(any(c[0] == "PUT" for c in calls))

    def test_alpha_draft_flag_rejects_internal_or_other_track_before_http(self):
        for target, track, status in [
            ("internal", "internal", "completed"),
            ("closed", "closed-team", "completed"),
            ("closed", "alpha", "draft"),
        ]:
            argv = self.argv.copy()
            argv[argv.index("--target") + 1] = target
            argv[argv.index("--track") + 1] = track
            argv[argv.index("--status") + 1] = status
            argv.append("--replace-existing-alpha-draft")
            result, calls, _, _ = self.run_main([], argv)
            self.assertEqual(result, 1)
            self.assertEqual(calls, [])

    def test_closed_alpha_default_requires_existing_track_and_preserves_draft(self):
        argv = self.argv + ["--send-for-review"]
        argv[argv.index("--track") + 1] = "alpha"
        for tracks in [[{"track": "internal"}], [{"track": "alpha", "releases": [{"versionCodes": ["10"], "status": "draft"}]}]]:
            with self.subTest(tracks=tracks):
                result, calls, _, _ = self.run_main(self.preflight(tracks=tracks)[:2] + [("DELETE", EDIT, {})], argv)
                self.assertEqual(result, 1)
                self.assertFalse(any(call[0] == "PUT" or call[1].startswith("/upload") or call[1].endswith(":commit") for call in calls))

    def test_all_lifecycle_states_are_reported_without_claiming_test_availability(self):
        for lifecycle, status in [("DRAFT", "draft"), ("NOT_SENT_FOR_REVIEW", "not_sent_for_review"),
                                  ("APPROVED_NOT_PUBLISHED", "approved_not_published"),
                                  ("NOT_APPROVED", "not_approved")]:
            with self.subTest(lifecycle=lifecycle):
                result, _, stdout, _ = self.run_main(self.preflight() + self.finish(lifecycle))
                self.assertEqual(result, 0)
                self.assertEqual(json.loads(stdout)["status"], status)
                self.assertFalse(json.loads(stdout)["available_to_testers"])

    def test_explicit_draft_status_is_sent_without_fallback(self):
        argv = self.argv[:-1] + ["draft"]
        result, calls, _, _ = self.run_main(self.preflight() + self.finish("DRAFT"), argv)
        self.assertEqual(result, 0)
        self.assertEqual(json.loads(next(c[3] for c in calls if c[0] == "PUT"))["releases"][0]["status"], "draft")

    def test_reserved_and_unsafe_tracks_fail_before_any_http(self):
        for track in ["production", "beta", "internal", "internalsharing", "qa",
                      "wear:production", "tv:beta", "automotive:internal", "wear:qa",
                      "wear:internalsharing", "PRODUCTION", "Beta", "INTERNAL", "InternalSharing",
                      "QA", "wear:PRODUCTION", "a/b", "internal%20", " internal", "internal ",
                      "wear:closed-team", "closed:team", "closed\nstatus=ok"]:
            with self.subTest(track=track):
                argv = self.argv.copy()
                argv[argv.index("--track") + 1] = track
                result, calls, _, _ = self.run_main([], argv)
                self.assertEqual(result, 1)
                self.assertEqual(calls, [])

    def test_missing_token_and_bad_bundle_fail_before_http(self):
        result, _, _, _ = self.run_main([], token="")
        self.assertEqual(result, 1)
        for payload in [b"not a zip", None]:
            if payload:
                self.aab.write_bytes(payload)
            else:
                with zipfile.ZipFile(self.aab, "w") as archive:
                    archive.writestr("BundleConfig.pb", b"missing manifest")
            result, _, _, _ = self.run_main([])
            self.assertEqual(result, 1)

    def test_unknown_track_only_cleans_own_edit(self):
        steps = self.preflight(tracks=[{"track": "production"}])[:2]
        result, calls, _, _ = self.run_main(steps + [("DELETE", EDIT, {})])
        self.assertEqual(result, 1)
        self.assertEqual([c[0] for c in calls], ["POST", "GET", "DELETE"])

    def test_existing_target_unfinished_release_is_protected(self):
        for status in ["draft", "inProgress", "halted", "unexpected"]:
            tracks = [{"track": "closed-team", "releases": [
                {"name": "someone else", "versionCodes": ["10"], "status": status}]}]
            with self.subTest(status=status):
                result, calls, _, _ = self.run_main(self.preflight(tracks=tracks)[:2] + [("DELETE", EDIT, {})])
                self.assertEqual(result, 1)
                self.assertFalse(any(c[0] == "PUT" for c in calls))

    def test_existing_version_requires_identical_aab_hash(self):
        result, calls, _, _ = self.run_main(self.preflight(bundles=[self.bundle()]) + self.finish(upload=False))
        self.assertEqual(result, 0)
        self.assertFalse(any(c[1].startswith("/upload") for c in calls))
        for sha in ["0" * 64, "", "invalid"]:
            with self.subTest(sha=sha):
                result, _, _, _ = self.run_main(self.preflight(bundles=[self.bundle(sha=sha)])[:4] + [("DELETE", EDIT, {})])
                self.assertEqual(result, 1)

    def test_higher_apk_or_track_version_blocks_upload(self):
        cases = [self.preflight(apks=[{"versionCode": 12}])[:4],
                 self.preflight(tracks=[{"track": "closed-team", "releases": [
                     {"versionCodes": ["12"], "status": "completed"}]}])[:4]]
        for steps in cases:
            with self.subTest(steps=steps):
                result, calls, _, _ = self.run_main(steps + [("DELETE", EDIT, {})])
                self.assertEqual(result, 1)
                self.assertFalse(any(c[1].startswith("/upload") for c in calls))

    def test_other_track_pending_or_unknown_lifecycle_blocks_mutation(self):
        for lifecycle in ["NOT_SENT_FOR_REVIEW", "IN_REVIEW", "APPROVED_NOT_PUBLISHED", "NOT_APPROVED", "FUTURE_STATE"]:
            with self.subTest(lifecycle=lifecycle):
                steps = self.preflight(pending={"production": self.releases(lifecycle, version=10)})[:5]
                result, calls, _, _ = self.run_main(steps + [("DELETE", EDIT, {})])
                self.assertEqual(result, 1)
                self.assertFalse(any(c[0] == "PUT" for c in calls))

    def test_target_draft_visible_only_in_lifecycle_response_is_protected(self):
        steps = self.preflight(pending={"closed-team": self.releases("DRAFT", version=10)})
        result, calls, _, _ = self.run_main(steps + [("DELETE", EDIT, {})])
        self.assertEqual(result, 1)
        self.assertFalse(any(c[0] == "PUT" for c in calls))

    def test_upload_response_version_and_hash_are_verified_before_track_update(self):
        for bundle in [self.bundle(version=12), self.bundle(sha="0" * 64), {"versionCode": 11}]:
            with self.subTest(bundle=bundle):
                result, calls, _, _ = self.run_main(self.preflight() + [
                    ("POST", "/upload" + EDIT + "/bundles", bundle), ("DELETE", EDIT, {})])
                self.assertEqual(result, 1)
                self.assertFalse(any(c[0] == "PUT" for c in calls))

    def test_arbitrary_api_error_is_sanitized_without_retry_or_draft_fallback(self):
        body = json.dumps({"error": {"message": TOKEN + "\n::error::unsafe", "status": TOKEN}}).encode()
        error = HTTPError("https://example.invalid", 400, TOKEN, {}, io.BytesIO(body))
        result, calls, stdout, stderr = self.run_main(self.preflight() + [
            ("POST", "/upload" + EDIT + "/bundles", error), ("DELETE", EDIT, {})])
        self.assertEqual(result, 1)
        self.assertIn("400", stderr)
        self.assertNotIn("::error::unsafe", stdout + stderr)
        self.assertEqual(sum(c[1].startswith("/upload") for c in calls), 1)

    def test_http_400_reports_safe_google_reason_and_static_upload_operation(self):
        reason = "Uploaded bundle uses an unsupported target SDK version."
        body = json.dumps({"error": {"code": 400, "status": "INVALID_ARGUMENT", "message": reason,
                                      "details": [{"private": TOKEN}], "errors": [{"message": TOKEN}]}}).encode()
        error = HTTPError("https://example.invalid/" + TOKEN, 400, TOKEN, {"Authorization": TOKEN}, io.BytesIO(body))
        result, calls, _, stderr = self.run_main(self.preflight() + [
            ("POST", "/upload" + EDIT + "/bundles", error), ("DELETE", EDIT, {})])
        self.assertEqual(result, 1)
        self.assertIn("POST bundles.upload", stderr)
        self.assertIn('"code": 400', stderr)
        self.assertIn('"status": "INVALID_ARGUMENT"', stderr)
        self.assertIn(reason, stderr)
        self.assertNotIn("https://", stderr)
        self.assertEqual(sum(c[1].startswith("/upload") for c in calls), 1)
        self.assertFalse(any(c[0] == "PUT" or c[1].endswith(":commit") for c in calls))

    def test_http_diagnostic_classifies_operations_without_printing_paths(self):
        cases = [("POST", BASE + "/edits", "edits.create"),
                 ("GET", EDIT + "/tracks", "tracks.list"),
                 ("GET", EDIT + "/bundles", "bundles.list"),
                 ("GET", EDIT + "/apks", "apks.list"),
                 ("GET", BASE + "/tracks/internal/releases", "releases.list"),
                 ("POST", "/upload" + EDIT + "/bundles?uploadType=media", "bundles.upload"),
                 ("PUT", EDIT + "/tracks/internal", "tracks.update"),
                 ("POST", EDIT + ":validate", "edits.validate"),
                 ("POST", EDIT + ":commit?changesNotSentForReview=true", "edits.commit"),
                 ("DELETE", EDIT, "edits.delete"),
                 ("GET", "/unknown/" + TOKEN, "unknown")]
        for method, path, operation in cases:
            with self.subTest(operation=operation):
                resource = io.BytesIO(b'{}')
                error = HTTPError("https://example.invalid/" + TOKEN, 400, TOKEN, {}, resource)
                with patch("urllib.request.urlopen", side_effect=error):
                    with self.assertRaises(self.publisher.PlayError) as caught:
                        self.publisher.request(TOKEN, method, path)
                message = str(caught.exception)
                self.assertIn(method + " " + operation, message)
                self.assertNotIn("our-edit", message)
                self.assertNotIn(TOKEN, message)
                self.assertNotIn("https://", message)
                self.assertTrue(resource.closed)

    def test_diagnostic_redacts_tokens_urls_and_credential_expressions(self):
        messages = ["Safe reason " + TOKEN + " and " + TOKEN,
                    "Read https://example.invalid/private?value=" + TOKEN + " for SDK details.",
                    "Read https://user:short-password@example.invalid/private for details.",
                    "Authorization: Bearer " + TOKEN,
                    "access_token=" + TOKEN, "refresh_token=short-private-value",
                    "id_token=short-private-value", "client_secret=short-private-value",
                    '"private_key":"short-private-value"', "password=short-private-value",
                    "keystorePassword=short-private-value", "keyPassword=short-private-value",
                    "keyAlias=short-private-value", '"credentials":{"value":"short-private-value"}',
                    "-----BEGIN PRIVATE KEY----- short-private-value -----END PRIVATE KEY-----",
                    "access_token=%70%72%69%76%61%74%65%2D%74%6F%6B%65%6E%2D%6E%65%76%65%72%2D%65%78%70%6F%73%65"]
        messages += ["Encoded reason " + "".join(f"%{ord(char):02X}" for char in TOKEN),
                     "Read https%3A%2F%2Fexample.invalid%2Fprivate%3Fvalue%3D" + TOKEN,
                     "Read https%253A%252F%252Fexample.invalid%252Fprivate%253Fvalue%253D" + TOKEN]
        messages += [TOKEN[:10] + "\x1b[31m" + TOKEN[10:],
                     "pass\x1b[31mword=short-private-value",
                     "Read htt\x1b[31mps://example.invalid/private for details.",
                     "Read //user:p1234@example.invalid/private for details.",
                     "api_key=short-private-value", "Cookie: short-private-value",
                     "alias=short-private-value"]
        for message in messages:
            with self.subTest(message=message):
                body = json.dumps({"error": {"code": 400, "status": "INVALID_ARGUMENT", "message": message}}).encode()
                error = HTTPError("https://example.invalid", 400, TOKEN, {}, io.BytesIO(body))
                result, _, stdout, stderr = self.run_main(self.preflight() + [
                    ("POST", "/upload" + EDIT + "/bundles", error), ("DELETE", EDIT, {})])
                self.assertEqual(result, 1)
                self.assertIn("POST bundles.upload", stderr)
                for private in [TOKEN, "example.invalid", "short-password", "short-private-value", "%70%72%69%76", "BEGIN PRIVATE KEY"]:
                    self.assertNotIn(private, stdout + stderr)

    def test_malformed_or_untrusted_error_fields_never_fall_back_to_raw_body(self):
        bodies = [TOKEN.encode(), b'{"error":', b'[]',
                  json.dumps({"error": [TOKEN]}).encode(),
                  json.dumps({"error": {"code": TOKEN, "status": TOKEN, "message": {"value": TOKEN}}}).encode(),
                  json.dumps({"error": {"code": True, "status": "PRIVATE_VALUE", "message": None}}).encode()]
        for body in bodies:
            with self.subTest(body=body):
                error = HTTPError("https://example.invalid", 400, TOKEN, {}, io.BytesIO(body))
                result, _, _, stderr = self.run_main(self.preflight() + [
                    ("POST", "/upload" + EDIT + "/bundles", error), ("DELETE", EDIT, {})])
                self.assertEqual(result, 1)
                self.assertIn("POST bundles.upload", stderr)
                self.assertNotIn("PRIVATE_VALUE", stderr)
                self.assertNotIn('"code": true', stderr)

    def test_http_diagnostic_is_bounded_one_line_and_cannot_inject_workflow_commands(self):
        body = json.dumps({"error": {"code": 400, "status": "INVALID_ARGUMENT", "message":
            "Invalid SDK.\r\n\x1b[31m::error::unsafe " + TOKEN + " " + ("safe detail " * 100)}}).encode()
        error = HTTPError("https://example.invalid", 400, TOKEN, {}, io.BytesIO(body))
        result, _, _, stderr = self.run_main(self.preflight() + [
            ("POST", "/upload" + EDIT + "/bundles", error), ("DELETE", EDIT, {})])
        self.assertEqual(result, 1)
        self.assertIn("Invalid SDK.", stderr)
        self.assertIn("POST bundles.upload", stderr)
        self.assertNotIn("\r", stderr)
        self.assertNotIn("\x1b", stderr)
        self.assertNotIn("::error::", stderr)
        self.assertEqual(len(stderr.splitlines()), 1)
        self.assertLess(len(stderr), 700)

    def test_diagnostic_preserves_server_and_timeout_uncertainty(self):
        for code in [408, 500, 503]:
            with self.subTest(code=code):
                error = HTTPError("https://example.invalid", code, TOKEN, {}, io.BytesIO(b'{}'))
                with patch("urllib.request.urlopen", side_effect=error):
                    with self.assertRaises(self.publisher.PlayError) as caught:
                        self.publisher.request(TOKEN, "POST", EDIT + ":commit")
                self.assertTrue(caught.exception.uncertain)
                self.assertIn("POST edits.commit", str(caught.exception))

    def test_commit_transport_failure_uses_read_verification_without_mutation_retry(self):
        result, calls, stdout, _ = self.run_main(self.preflight() + self.finish(commit=URLError(TOKEN)))
        self.assertEqual(result, 0)
        self.assertEqual(json.loads(stdout)["status"], "published")
        self.assertEqual(sum(c[1].endswith(":commit") for c in calls), 1)
        self.assertFalse(any(c[0] == "DELETE" for c in calls))

    def test_unknown_commit_result_is_reported_without_cleanup_or_recommit(self):
        steps = self.preflight() + self.finish(commit=URLError(TOKEN))[:-1] + [
            ("GET", f"{BASE}/tracks/closed-team/releases", {"releases": []})] * 3
        result, calls, _, stderr = self.run_main(steps)
        self.assertEqual(result, 1)
        self.assertIn("미확정", stderr)
        self.assertIn("status=uncertain", self.output.read_text())
        self.assertIn("게시 처리 결과 미확정", self.summary.read_text())
        self.assertFalse(any(c[0] == "DELETE" for c in calls))

    def test_commit_http_error_never_cleans_up_or_retries(self):
        error = HTTPError("https://example.invalid", 400, TOKEN, {}, io.BytesIO(b"{}"))
        result, calls, _, _ = self.run_main(self.preflight() + self.finish(commit=error)[:-1])
        self.assertEqual(result, 1)
        self.assertEqual(sum(c[1].endswith(":commit") for c in calls), 1)
        self.assertFalse(any(c[0] == "DELETE" for c in calls))

    def test_upload_transport_failure_cleans_own_edit_without_commit_uncertainty(self):
        result, calls, _, _ = self.run_main(self.preflight() + [
            ("POST", "/upload" + EDIT + "/bundles", URLError(TOKEN)),
            ("DELETE", EDIT, {})])
        self.assertEqual(result, 1)
        self.assertFalse(any(c[1].endswith(":commit") for c in calls))
        self.assertFalse(self.output.exists(), "A precommit failure is not an unknown commit")

    def test_postcommit_missing_version_unknown_state_or_bad_response_is_uncertain(self):
        responses = [self.releases(version=10), self.releases("FUTURE_STATE"),
                     {"releases": None}, {"releases": [{"activeArtifacts": None}]}]
        for response in responses:
            with self.subTest(response=response):
                self.output.unlink(missing_ok=True)
                steps = self.preflight() + self.finish()[:-1] + [
                    ("GET", f"{BASE}/tracks/closed-team/releases", response)] * 3
                result, calls, _, stderr = self.run_main(steps)
                self.assertEqual(result, 1)
                self.assertIn("미확정", stderr)
                self.assertIn("status=uncertain", self.output.read_text())
                self.assertFalse(any(c[0] == "DELETE" for c in calls))

    def test_commit_transport_and_read_failure_remain_uncertain_without_retry(self):
        result, calls, _, stderr = self.run_main(self.preflight() + self.finish(commit=URLError(TOKEN))[:-1] + [
            ("GET", f"{BASE}/tracks/closed-team/releases", URLError(TOKEN))] * 3)
        self.assertEqual(result, 1)
        self.assertIn("미확정", stderr)
        self.assertEqual(sum(c[1].endswith(":commit") for c in calls), 1)
        self.assertFalse(any(c[0] == "DELETE" for c in calls))

    def test_draft_app_restriction_is_actionable_without_automatic_draft_retry(self):
        body = b'{"error":{"message":"Only releases with status draft may be created on draft app."}}'
        error = HTTPError("https://example.invalid", 400, TOKEN, {}, io.BytesIO(body))
        steps = self.preflight() + self.finish()[:1] + [
            ("PUT", f"{EDIT}/tracks/closed-team", error), ("DELETE", EDIT, {})]
        result, calls, _, stderr = self.run_main(steps)
        self.assertEqual(result, 1)
        self.assertIn("Play Console", stderr)
        self.assertEqual(sum(c[0] == "PUT" for c in calls), 1)

    def test_postcommit_lookup_retries_only_reads_until_new_version_is_visible(self):
        steps = self.preflight() + self.finish()[:-1] + [
            ("GET", f"{BASE}/tracks/closed-team/releases", {"releases": []}),
            ("GET", f"{BASE}/tracks/closed-team/releases", self.releases())]
        result, calls, stdout, _ = self.run_main(steps)
        self.assertEqual(result, 0)
        self.assertEqual(json.loads(stdout)["status"], "published")
        self.assertEqual(sum(c[1].endswith(":commit") for c in calls), 1)
        self.assertEqual([call[0] for call in calls[-2:]], ["GET", "GET"])

    def test_auth_permission_and_review_errors_have_safe_actionable_labels(self):
        cases = [(401, b"{}", "인증"), (403, b"{}", "권한"),
                 (400, b'{"error":{"details":[{"reason":"CHANGES_ALREADY_IN_REVIEW"}]}}', "심사")]
        for code, body, label in cases:
            with self.subTest(code=code):
                error = HTTPError("https://example.invalid", code, TOKEN, {}, io.BytesIO(body))
                result, _, _, stderr = self.run_main(self.preflight() + [
                    ("POST", "/upload" + EDIT + "/bundles", error), ("DELETE", EDIT, {})])
                self.assertEqual(result, 1)
                self.assertIn(label, stderr)

    def test_every_http_error_branch_closes_its_response_resource(self):
        cases = [(400, b"{}"), (401, b"{}"), (403, b"{}"), (409, b"{}"), (500, b"{}"),
                 (400, b'{"error":{"message":"Only releases with status draft may be created on draft app."}}'),
                 (400, b'{"error":{"details":[{"reason":"CHANGES_ALREADY_IN_REVIEW"}]}}')]
        for code, body in cases:
            with self.subTest(code=code, body=body):
                resource = io.BytesIO(body)
                self.addCleanup(resource.close)
                error = HTTPError("https://example.invalid", code, TOKEN, {}, resource)
                result, _, _, _ = self.run_main(self.preflight() + [
                    ("POST", "/upload" + EDIT + "/bundles", error), ("DELETE", EDIT, {})])
                self.assertEqual(result, 1)
                self.assertTrue(resource.closed, "The HTTP error response must be closed explicitly")

    def test_http_error_response_is_closed_even_when_reading_its_body_fails(self):
        class UnreadableBody(io.BytesIO):
            def read(self, *args):
                raise OSError(TOKEN)

        resource = UnreadableBody()
        self.addCleanup(resource.close)
        error = HTTPError("https://example.invalid", 400, TOKEN, {}, resource)
        result, _, _, _ = self.run_main(self.preflight() + [
            ("POST", "/upload" + EDIT + "/bundles", error), ("DELETE", EDIT, {})])
        self.assertEqual(result, 1)
        self.assertTrue(resource.closed, "Reading failures must not leak HTTP error responses")

    def test_real_cli_reports_missing_token_without_traceback(self):
        env = os.environ.copy()
        env.pop("PLAY_ACCESS_TOKEN", None)
        process = subprocess.run([sys.executable, str(SCRIPT)] + self.argv, env=env,
                                 text=True, capture_output=True, timeout=10)
        self.assertEqual(process.returncode, 1)
        self.assertIn("PLAY_ACCESS_TOKEN", process.stderr)
        self.assertNotIn("Traceback", process.stderr)


if __name__ == "__main__":
    unittest.main()
