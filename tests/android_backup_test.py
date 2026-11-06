import importlib.util
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("backup_policy", ROOT / "scripts/configure_android_backup.py")
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)


class AndroidBackupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = Path(self.temp.name) / "app"
        self.main = self.app / "src/main"
        self.main.mkdir(parents=True)
        with tarfile.open(ROOT / "node_modules/@capacitor/cli/assets/android-template.tar.gz") as archive:
            item = next(m for m in archive.getmembers() if m.name.endswith("src/main/AndroidManifest.xml"))
            self.original = archive.extractfile(item).read()
        (self.main / "AndroidManifest.xml").write_bytes(self.original)

    def tearDown(self):
        self.temp.cleanup()

    def test_real_capacitor_manifest_disables_backup_and_links_both_rule_sets(self):
        policy.configure(self.app)
        app = ET.parse(self.main / "AndroidManifest.xml").getroot().find("application")
        self.assertEqual(app.get(f"{{{policy.ANDROID}}}allowBackup"), "false")
        self.assertEqual(app.get(f"{{{policy.ANDROID}}}fullBackupContent"), "@xml/borc_backup_rules")
        self.assertEqual(app.get(f"{{{policy.ANDROID}}}dataExtractionRules"), "@xml/borc_data_extraction_rules")
        legacy = ET.parse(self.main / "res/xml/borc_backup_rules.xml").getroot()
        policy.assert_excludes_all(legacy)
        modern = ET.parse(self.main / "res/xml/borc_data_extraction_rules.xml").getroot()
        policy.assert_excludes_all(modern.find("cloud-backup"))
        policy.assert_excludes_all(modern.find("device-transfer"))

    def test_android_package_name_is_consistent(self):
        expected = "com.ahmetbayrak19.borctakip"
        config = json.loads((ROOT / "capacitor.config.json").read_text())
        self.assertEqual(config["appId"], expected)
        for source in ["MainActivity.java", "GoogleDriveAuthPlugin.java"]:
            text = (ROOT / "android-plugins" / source).read_text()
            self.assertIn(f"package {expected};", text)
            self.assertNotIn("com.borctakip.app", text)
        workflow = (ROOT / ".github/workflows/build-apk.yml").read_text()
        self.assertIn("android/app/src/main/java/com/ahmetbayrak19/borctakip", workflow)
        self.assertNotIn("java/com/borctakip/app", workflow)
        self.assertIn("s/minSdkVersion = [0-9]+/minSdkVersion = 24/", workflow)

    def test_rerunning_configuration_preserves_activity_provider_and_existing_records(self):
        private_data = self.app / "existing-records.json"
        private_data.write_text('{"sample":100}')
        policy.configure(self.app)
        first = (self.main / "AndroidManifest.xml").read_bytes()
        policy.configure(self.app)
        self.assertEqual((self.main / "AndroidManifest.xml").read_bytes(), first)
        self.assertEqual(private_data.read_text(), '{"sample":100}')
        original = ET.fromstring(self.original)
        current = ET.parse(self.main / "AndroidManifest.xml").getroot()
        def signature(node):
            return node.tag, node.attrib, (node.text or "").strip(), tuple(signature(child) for child in node)
        for name in ["activity", "provider"]:
            self.assertEqual(signature(original.find("application/" + name)), signature(current.find("application/" + name)))
        self.assertEqual([p.attrib for p in original.findall("uses-permission")], [p.attrib for p in current.findall("uses-permission")])

    def test_incomplete_transfer_rules_are_rejected(self):
        rules = policy.exclusion_rules("device-transfer")
        rules.remove(rules.find("exclude"))
        with self.assertRaises(ValueError):
            policy.assert_excludes_all(rules)

    def test_invalid_manifest_is_not_overwritten(self):
        manifest = self.main / "AndroidManifest.xml"
        manifest.write_text("<manifest/>")
        with self.assertRaises(ValueError):
            policy.configure(self.app)
        self.assertEqual(manifest.read_text(), "<manifest/>")


if __name__ == "__main__":
    unittest.main()
