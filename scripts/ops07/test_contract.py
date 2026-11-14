"""Offline OPS-07 automatic-event and release authorization negative fixtures."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("ops07audit", ROOT / "scripts/ops07/audit.py")
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def module(path):
    full = ROOT / path
    if not full.is_file():
        return None
    spec = importlib.util.spec_from_file_location("ops07_" + full.stem, full)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class NegativeScenarios(unittest.TestCase):
    def test_auto_publisher_is_detected(self):
        for event in ("push","workflow_run","issue_comment"):
            with self.subTest(event=event):
                example = ("on:\n  "+event+":\n    types: [completed]\n"
                           "jobs:\n  publish:\n    if: needs.gate.outputs.ready == 'true'\n"
                           "    runs-on: ubuntu-latest\n    steps:\n      - run: python3 publisher.py deploy\n")
                self.assertTrue(audit.automatic_mutations("play-release.yml", example))

    def test_manual_or_disabled_publisher_is_allowed(self):
        example = ("on:\n  workflow_run:\n    types: [completed]\n  workflow_dispatch:\n"
                   "jobs:\n  publish:\n    if: github.event_name == 'workflow_dispatch' && inputs.approved == true\n"
                   "    runs-on: ubuntu-latest\n    steps:\n      - run: python3 publisher.py deploy\n"
                   "  release:\n    if: >-\n      false && github.event_name == 'workflow_run'\n"
                   "    runs-on: ubuntu-latest\n    steps:\n      - run: gh release create v1\n")
        self.assertEqual(audit.automatic_mutations("play-release.yml", example), [])

    def test_manual_or_auto_condition_does_not_count_as_approval(self):
        example = ("on:\n  workflow_run:\n    types: [completed]\n  workflow_dispatch:\n"
                   "jobs:\n  upload:\n    if: >-\n"
                   "      github.event_name == 'workflow_dispatch' ||\n"
                   "      github.event_name == 'workflow_run'\n"
                   "    runs-on: ubuntu-latest\n    steps:\n      - run: python3 listing.py --apply\n")
        self.assertTrue(audit.automatic_mutations("store-listing.yml", example))


    def test_existing_npm_mobile_play_submit_is_an_automatic_publisher(self):
        example = ("on:\n  push:\n    branches: [main]\n"
                   "jobs:\n  build:\n    runs-on: ubuntu-latest\n"
                   "    steps:\n      - run: npm run mb:submit:android:play\n")
        self.assertTrue(audit.automatic_mutations("ci.yml", example))


class AppContracts(unittest.TestCase):
    def test_all_release_stages_and_no_automatic_publishers(self):
        problems = audit.findings()
        self.assertEqual(problems, [], "\n".join(problems))

    def test_mismatched_source_and_fake_store_approval(self):
        mod = module("scripts/ops06/store_gate.py")
        self.assertIsNotNone(mod, "OPS-06 store guard is not present")
        env = {"GITHUB_REPOSITORY": audit.REPOSITORY, "GITHUB_EVENT_NAME": "workflow_dispatch",
               "GITHUB_REF": "refs/heads/main", "GITHUB_SHA": "a"*40,
               "OPS06_EXPECTED_MAIN_SHA": "a"*40, "OPS06_STORE_APPROVED": "true",
               "OPS06_CONFIRMATION": mod.PHRASE,
               "OPS06_BATCH_ID": "2026-11-13-"+mod.APP_SLUG}
        for key, value in (("GITHUB_EVENT_NAME", "workflow_run"),
                           ("GITHUB_REF", "refs/heads/feature"),
                           ("OPS06_STORE_APPROVED", "false"),
                           ("OPS06_CONFIRMATION", "WRONG"),
                           ("OPS06_EXPECTED_MAIN_SHA", "b"*40)):
            with self.subTest(key=key):
                with patch.object(mod, "command_output") as network:
                    with self.assertRaises(mod.StoreApprovalError):
                        mod.verify({**env,key:value})
                    network.assert_not_called()

    def test_unapproved_closed_track_wrong_bundle_and_draft(self):
        mod = module("scripts/ops05/promotion.py")
        self.assertIsNotNone(mod, "OPS-05 closed promotion source missing")
        env = {"GITHUB_EVENT_NAME":"workflow_dispatch","GITHUB_REF":"refs/heads/main",
               "GITHUB_REPOSITORY":audit.REPOSITORY,"EXPECTED_REPO":audit.REPOSITORY,
               "GITHUB_SHA":"a"*40,"EXPECTED_MAIN_SHA":"a"*40,
               "BATCH_ID":"2026-11-13-ops07","APP_PACKAGE":audit.PACKAGE,
               "INTERNAL_TRACK":"internal","CLOSED_TRACK":"alpha",
               "VERSION_CODE":"19","AAB_SHA256":"b"*64,"MODE":"promote",
               "FINAL_BATCH_APPROVED":"true","APPROVAL_PHRASE":mod.APPROVAL,
               "HOMECREW_FINAL_APPROVAL":"HOMECREW_FINAL_RELEASE_APPROVED"}
        for key, value in (("FINAL_BATCH_APPROVED","false"),
                           ("AAB_SHA256","z"*64),
                           ("CLOSED_TRACK","production"),
                           ("CLOSED_TRACK","internal"),
                           ("EXPECTED_MAIN_SHA","c"*40)):
            with self.subTest(key=key,value=value):
                with self.assertRaises(mod.Stop):
                    mod.parse_request({**env,key:value})
        req=mod.parse_request(env)
        tracks=[{"track":"internal","releases":[
            {"status":"completed","versionCodes":["19"],"name":"1.0"}]},
            {"track":"alpha","releases":[]}]
        self.assertEqual(mod.make_plan(tracks,[{"versionCode":19,"sha256":"b"*64}],req)["state"],"ready")
        with self.assertRaises(mod.Stop):
            mod.make_plan(tracks,[{"versionCode":19,"sha256":"c"*64}],req)
        tracks[0]["releases"][0]["status"]="draft"
        with self.assertRaises(mod.Stop):
            mod.make_plan(tracks,[{"versionCode":19,"sha256":"b"*64}],req)

    def test_store_authentication_and_upload_cannot_ignore_rejected_approval(self):
        source_path = ".github/workflows/invitation-store-screenshots.yml"
        original_read = audit.read
        source = original_read(source_path)
        for name in ("Authenticate Google Play using short-lived Workload Identity token",
                     "Upload only ko-KR phoneScreenshots within transactional Play edit"):
            with self.subTest(step=name):
                step = "      - name: " + name + "\n"
                self.assertIn(step, source)
                changed = source.replace(step, step + "        if: always()\n", 1)
                with patch.object(audit, "read", side_effect=lambda path:
                                  changed if path == source_path else original_read(path)):
                    blockers = audit.findings()
                self.assertTrue(any("STORE_BYPASS: invitation-store-screenshots.yml" in issue
                                    for issue in blockers), blockers)

    def test_internal_aab_verification_must_execute_before_publishing(self):
        path = ".github/workflows/play-internal-release.yml"
        original_read = audit.read
        original = original_read(path)
        call = "run: python3 scripts/ops04/internal.py verify"
        self.assertEqual(original.count(call), 2)
        last = original.rfind(call)
        variants = (
            ("missing_verify_job", original.replace(call, "run: echo unchecked", 1)),
            ("missing_publish_job", original[:last] + "run: echo unchecked" +
             original[last + len(call):]),
            ("optional_verify", original.replace(
                "      - name: Verify identical signer, package and AAB SHA-256 again\n",
                "      - name: Verify identical signer, package and AAB SHA-256 again\n"
                "        continue-on-error: true\n", 1)),
            ("unverified_output", original.replace(
                "VERIFIED_AAB: " + "$" + "{{ steps.verified.outputs.aab }}",
                "VERIFIED_AAB: " + "$" + "{{ inputs.aab_file }}", 1)),
            ("different_bundle", original.replace(
                '--aab "$VERIFIED_AAB"', '--aab "$OTHER_AAB"', 1)),
        )
        for label, altered in variants:
            with self.subTest(label=label):
                with patch.object(audit, "read", side_effect=lambda target:
                                  altered if target == path else original_read(target)):
                    issues = audit.findings()
                self.assertTrue(any("AAB_VERIFY:" in item for item in issues), issues)

    def test_store_metadata_approvals_must_bind_to_dispatch_inputs(self):
        original_read = audit.read
        for filename in ("store-icon-sync.yml", "invitation-store-screenshots.yml"):
            path = ".github/workflows/" + filename
            original = original_read(path)
            for key, field, forged in (
                ("OPS06_STORE_APPROVED", "ops06_store_approved", "'true'"),
                ("OPS06_CONFIRMATION", "ops06_confirmation",
                 "APPLY_VERIFIED_PLAY_STORE_ASSETS"),
                ("OPS06_EXPECTED_MAIN_SHA", "ops06_expected_main_sha",
                 "$" + "{{ github.sha }}"),
                ("OPS06_BATCH_ID", "ops06_batch_id", "'2026-11-14-invitation'"),
            ):
                with self.subTest(filename=filename, key=key):
                    expected = key + ": " + "$" + "{{ inputs." + field + " }}"
                    self.assertIn(expected, original)
                    changed = original.replace(expected, key + ": " + forged, 1)
                    with patch.object(audit, "read", side_effect=lambda target:
                                      changed if target == path else original_read(target)):
                        issues = audit.findings()
                    self.assertTrue(any("STORE_INPUT_BINDING:" in item for item in issues), issues)

    def test_play_release_approvals_reject_forged_environment(self):
        original_read = audit.read
        for stage, filename, cases in (
            ("OPS04", "play-internal-release.yml", (
                ("FINAL_RELEASE_APPROVED", "final_release_approved", "'true'"),
                ("APPROVAL_PHRASE", "approval_phrase",
                 "PUBLISH_VERIFIED_INTERNAL_AAB"),
                ("EXPECTED_MAIN_SHA", "expected_main_sha", "$" + "{{ github.sha }}"),
                ("AAB_SHA256", "aab_sha256", "'" + "0" * 64 + "'"),
            )),
            ("OPS05", "play-closed-release.yml", (
                ("FINAL_BATCH_APPROVED", "final_batch_approved", "'true'"),
                ("APPROVAL_PHRASE", "approval_phrase",
                 "PROMOTE_VERIFIED_INTERNAL_VERSION"),
                ("EXPECTED_MAIN_SHA", "expected_main_sha", "$" + "{{ github.sha }}"),
                ("CLOSED_TRACK", "closed_track", "alpha"),
                ("AAB_SHA256", "aab_sha256", "'" + "0" * 64 + "'"),
            )),
        ):
            path = ".github/workflows/" + filename
            original = original_read(path)
            for key, field, forged in cases:
                with self.subTest(stage=stage, key=key):
                    expected = key + ": " + "$" + "{{ inputs." + field + " }}"
                    self.assertIn(expected, original)
                    mutated = original.replace(expected, key + ": " + forged, 1)
                    with patch.object(audit, "read", side_effect=lambda target:
                                      mutated if target == path else original_read(target)):
                        findings = audit.findings()
                    self.assertTrue(any("RELEASE_INPUT_BINDING: Invitation " + stage
                                        + " " + key in issue for issue in findings), findings)

    def test_missing_existing_aab_cannot_be_published(self):
        mod=module("scripts/ops04/internal.py")
        self.assertIsNotNone(mod, "OPS-04 immutable AAB guard missing")
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(mod,"BUNDLE_PATH",Path(tmp)):
                with self.assertRaises(mod.GateError):
                    mod.verify()


if __name__ == "__main__":
    unittest.main()
