import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile


SCRIPT = Path(__file__).with_name("verify-mobile-release.py")
SHA = "1234567890abcdef1234567890abcdef12345678"
BASE_NAME = "invitation-1.0.5-code211-1234567890ab"
MANIFEST = '<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="kr.msgnote.mobileinvitation" android:versionCode="211" android:versionName="1.0.5"><application /></manifest>'


class ReleaseArtifactTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.manifest = self.directory / "manifest.xml"
        self.manifest.write_text(MANIFEST, encoding="utf-8")
        for extension, entries in [("apk", {"AndroidManifest.xml": b"binary-manifest"}),
                                   ("aab", {"BundleConfig.pb": b"config", "base/manifest/AndroidManifest.xml": b"protobuf-manifest"})]:
            with zipfile.ZipFile(self.directory / f"{BASE_NAME}.{extension}", "w") as archive:
                for name, data in entries.items():
                    archive.writestr(name, data)
        self.options = ["--directory", str(self.directory), "--base-name", BASE_NAME,
                        "--version-name", "1.0.5", "--version-code", "211",
                        "--source-sha", SHA, "--run-id", "1234", "--run-attempt", "1"]

    def run_cli(self, command, options=None):
        args = self.options if options is None else options
        if command == "stage":
            args = args + ["--manifest", str(self.manifest)]
        return subprocess.run([sys.executable, str(SCRIPT), command, *args],
                              capture_output=True, text=True, check=False)

    def stage(self):
        self.assertTrue(SCRIPT.is_file(), "Release artifact verifier must exist before staging")
        result = self.run_cli("stage")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_roundtrip_binds_both_artifacts_to_source_version_and_workflow_run(self):
        self.stage()
        provenance = json.loads((self.directory / "provenance.json").read_text(encoding="utf-8"))
        self.assertEqual(provenance["source_sha"], SHA)
        self.assertEqual(provenance["run_id"], "1234")
        self.assertEqual(provenance["run_attempt"], "1")
        self.assertEqual(provenance["package_name"], "kr.msgnote.mobileinvitation")
        self.assertEqual(provenance["version_code"], 211)
        self.assertEqual(set(provenance["artifacts"]), {f"{BASE_NAME}.apk", f"{BASE_NAME}.aab"})
        result = self.run_cli("verify")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_aab_manifest_package_or_version_mismatch_never_stages(self):
        self.assertTrue(SCRIPT.is_file(), "AAB manifest must be checked before upload")
        for old, new in [("kr.msgnote.mobileinvitation", "other.package"),
                         ('versionCode="211"', 'versionCode="212"'),
                         ('versionName="1.0.5"', 'versionName="1.0.6"')]:
            with self.subTest(new=new):
                self.manifest.write_text(MANIFEST.replace(old, new), encoding="utf-8")
                self.assertNotEqual(self.run_cli("stage").returncode, 0)
                self.assertFalse((self.directory / "provenance.json").exists())

    def test_missing_or_malformed_aab_manifest_never_stages(self):
        self.assertTrue(SCRIPT.is_file(), "AAB manifest validation must fail closed")
        for xml in ["not XML", "<application />", "<manifest />", MANIFEST.replace('android:versionCode="211"', '')]:
            with self.subTest(xml=xml):
                self.manifest.write_text(xml, encoding="utf-8")
                self.assertNotEqual(self.run_cli("stage").returncode, 0)
                self.assertFalse((self.directory / "provenance.json").exists())

    def test_changed_apk_or_aab_is_rejected_after_download(self):
        for extension in ["apk", "aab"]:
            with self.subTest(extension=extension):
                self.stage()
                path = self.directory / f"{BASE_NAME}.{extension}"
                previous = path.read_bytes()
                path.write_bytes(previous + b"changed")
                self.assertNotEqual(self.run_cli("verify").returncode, 0)
                path.write_bytes(previous)

    def test_different_commit_version_or_run_is_rejected(self):
        self.stage()
        for key, value in [("--source-sha", "a" * 40), ("--version-code", "212"),
                           ("--version-name", "1.0.6"), ("--run-id", "1235"),
                           ("--run-attempt", "2"), ("--base-name", "../other")]:
            with self.subTest(key=key):
                options = self.options.copy()
                options[options.index(key) + 1] = value
                self.assertNotEqual(self.run_cli("verify", options).returncode, 0)

    def test_missing_corrupted_or_incomplete_provenance_is_rejected(self):
        self.stage()
        path = self.directory / "provenance.json"
        original = json.loads(path.read_text(encoding="utf-8"))
        for data in ["not json", "[]", "{}", json.dumps({**original, "artifacts": {}}),
                     json.dumps({**original, "schema_version": 2})]:
            with self.subTest(data=data):
                path.write_text(data, encoding="utf-8")
                self.assertNotEqual(self.run_cli("verify").returncode, 0)
        path.unlink()
        self.assertNotEqual(self.run_cli("verify").returncode, 0)

    def test_empty_missing_or_invalid_artifact_never_stages(self):
        self.assertTrue(SCRIPT.is_file(), "Only complete APK and AAB may be staged")
        path = self.directory / f"{BASE_NAME}.aab"
        for data in [b"", b"not zip"]:
            with self.subTest(data=data):
                path.write_bytes(data)
                self.assertNotEqual(self.run_cli("stage").returncode, 0)
        path.unlink()
        self.assertNotEqual(self.run_cli("stage").returncode, 0)


if __name__ == "__main__":
    unittest.main()
