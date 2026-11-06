"""Disable Android-managed restoration; the app's opt-in Drive sync stays independent."""
import argparse
import json
from pathlib import Path
import re
import struct
import xml.etree.ElementTree as ET
import zipfile

ANDROID = "http://schemas.android.com/apk/res/android"
DOMAINS = ("root", "file", "database", "sharedpref", "external", "device_root", "device_file", "device_database", "device_sharedpref")
ET.register_namespace("android", ANDROID)


def exclusion_rules(tag):
    root = ET.Element(tag)
    for domain in DOMAINS:
        ET.SubElement(root, "exclude", {"domain": domain, "path": "."})
    return root


def write_xml(path, root):
    path.parent.mkdir(parents=True, exist_ok=True)
    ET.indent(root)
    ET.ElementTree(root).write(path, encoding="utf-8", xml_declaration=True)


def configure(app_dir):
    main = Path(app_dir) / "src/main"
    manifest_path = main / "AndroidManifest.xml"
    tree = ET.parse(manifest_path)
    application = tree.getroot().find("application")
    if application is None:
        raise ValueError("Android application element is missing")
    application.set(f"{{{ANDROID}}}allowBackup", "false")
    application.set(f"{{{ANDROID}}}fullBackupContent", "@xml/borc_backup_rules")
    application.set(f"{{{ANDROID}}}dataExtractionRules", "@xml/borc_data_extraction_rules")
    write_xml(manifest_path, tree.getroot())
    write_xml(main / "res/xml/borc_backup_rules.xml", exclusion_rules("full-backup-content"))
    extraction = ET.Element("data-extraction-rules")
    extraction.append(exclusion_rules("cloud-backup"))
    extraction.append(exclusion_rules("device-transfer"))
    write_xml(main / "res/xml/borc_data_extraction_rules.xml", extraction)


def read_binary_xml(data):
    """Read compiled APK XML using Android's resource chunk/string pool format."""
    if struct.unpack_from("<H", data)[0] != 3:
        raise ValueError("Not Android binary XML")
    strings, stack, root = [], [], None
    cursor = struct.unpack_from("<H", data, 2)[0]
    while cursor < len(data):
        kind, header_size, size = struct.unpack_from("<HHI", data, cursor)
        if size < 8 or cursor + size > len(data):
            raise ValueError("Invalid XML resource chunk")
        if kind == 1:
            count = struct.unpack_from("<I", data, cursor + 8)[0]
            utf8 = bool(struct.unpack_from("<I", data, cursor + 16)[0] & 0x100)
            start = cursor + struct.unpack_from("<I", data, cursor + 20)[0]

            def length_at(position, eight_bit):
                value = data[position] if eight_bit else struct.unpack_from("<H", data, position)[0]
                step, mask = (1, 0x80) if eight_bit else (2, 0x8000)
                if value & mask:
                    other = data[position + step] if eight_bit else struct.unpack_from("<H", data, position + step)[0]
                    return ((value & (mask - 1)) << (8 if eight_bit else 16)) | other, position + step * 2
                return value, position + step

            for index in range(count):
                offset = struct.unpack_from("<I", data, cursor + header_size + index * 4)[0]
                length, position = length_at(start + offset, utf8)
                if utf8:
                    length, position = length_at(position, True)
                strings.append(data[position:position + length * (1 if utf8 else 2)].decode("utf-8" if utf8 else "utf-16-le"))
        elif kind == 0x102:
            name = strings[struct.unpack_from("<I", data, cursor + 20)[0]]
            attr_start, attr_size, count = struct.unpack_from("<HHH", data, cursor + 24)
            attrs = {}
            for index in range(count):
                offset = cursor + 16 + attr_start + attr_size * index
                name_index, raw = struct.unpack_from("<II", data, offset + 4)
                value_type, value = data[offset + 15], struct.unpack_from("<I", data, offset + 16)[0]
                if raw != 0xffffffff:
                    text = strings[raw]
                elif value_type == 3:
                    text = strings[value]
                elif value_type == 0x12:
                    text = "true" if value else "false"
                else:
                    text = hex(value)
                attrs[strings[name_index]] = text
            element = ET.Element(name, attrs)
            if stack:
                stack[-1].append(element)
            else:
                root = element
            stack.append(element)
        elif kind == 0x103:
            name = strings[struct.unpack_from("<I", data, cursor + 20)[0]]
            if not stack or stack.pop().tag != name:
                raise ValueError("Unbalanced XML resource")
        cursor += size
    if root is None or stack:
        raise ValueError("Incomplete XML resource")
    return root


def assert_excludes_all(element):
    if element is None or element.findall("include"):
        raise ValueError("All app data must be excluded")
    rules = {(r.get("domain"), r.get("path")) for r in element.findall("exclude")}
    if rules != {(domain, ".") for domain in DOMAINS}:
        raise ValueError("A backup storage domain was not excluded")


def inspect_apk(path, verify=False):
    with zipfile.ZipFile(path) as archive:
        manifest = read_binary_xml(archive.read("AndroidManifest.xml"))
        application = manifest.find("application")
        source = archive.read("assets/public/app.js").decode()
        public = [n for n in archive.namelist() if n.startswith("assets/public/")]
        legacy = "res/xml/borc_backup_rules.xml"
        extraction = "res/xml/borc_data_extraction_rules.xml"
        report = {
            "allow_backup": application.get("allowBackup"),
            "exclusion_resources_present": legacy in archive.namelist() and extraction in archive.namelist(),
            "initial_records_empty": all(re.search(r"let\s+" + name + r"\s*=\s*\[\s*\]", source) for name in ("debts", "incomes", "payments")),
            "runtime_database_packaged": any(n.endswith((".db", ".sqlite", "borc-takip-data.json")) or "/Local Storage/" in n for n in public),
        }
        if verify:
            if report["allow_backup"] != "false" or not report["exclusion_resources_present"]:
                raise ValueError("The APK still permits Android-managed restoration")
            if not report["initial_records_empty"] or report["runtime_database_packaged"]:
                raise ValueError("The APK must start with empty user records")
            if not application.get("fullBackupContent") or not application.get("dataExtractionRules"):
                raise ValueError("Backup exclusion resources are not linked in the manifest")
            assert_excludes_all(read_binary_xml(archive.read(legacy)))
            rules = read_binary_xml(archive.read(extraction))
            assert_excludes_all(rules.find("cloud-backup"))
            assert_excludes_all(rules.find("device-transfer"))
        return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app-dir", default="android/app")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--inspect-apk")
    group.add_argument("--verify-apk")
    args = parser.parse_args()
    if args.inspect_apk or args.verify_apk:
        print(json.dumps(inspect_apk(args.inspect_apk or args.verify_apk, bool(args.verify_apk))))
    else:
        configure(args.app_dir)
        print("Android automatic backup and device-transfer restoration disabled.")
