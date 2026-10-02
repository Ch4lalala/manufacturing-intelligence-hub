#!/usr/bin/env python3
"""Verify packaged source and deliverable bytes without external dependencies.
Extra files created later (e.g. app/) are allowed; original expected files are not.
"""
from pathlib import Path
import hashlib, json, sys

ROOT = Path(__file__).resolve().parents[1]

def check(entries, label):
    errors = []
    for entry in entries:
        path = ROOT / entry['path']
        if not path.is_file():
            errors.append(f"missing: {entry['path']}")
            continue
        if path.stat().st_size != entry['bytes']:
            errors.append(f"size changed: {entry['path']}")
        if hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
            errors.append(f"hash changed: {entry['path']}")
    print(f"{label}: {len(entries)} files checked; {len(errors)} discrepancies")
    for error in errors: print(error)
    return errors

def main():
    inventory = json.loads((ROOT/'processed/source_inventory.json').read_text(encoding='utf-8'))
    errors = check(inventory, 'Original source snapshot')
    if len(inventory) != 22: errors.append('Expected 22 source snapshot files')
    manifest = ROOT/'PACKAGE_MANIFEST.json'
    if manifest.is_file():
        errors += check(json.loads(manifest.read_text(encoding='utf-8'))['files'], 'Handoff package')
    else:
        print('PACKAGE_MANIFEST.json not present; source verification only')
    metrics = json.loads((ROOT/'processed/verified_metrics.json').read_text(encoding='utf-8'))
    for field, expected in {'incident_count':380,'missing_ar_count':226,'Downtime (hrs)':2261.1,'Act. Loss (k US$)':61886.46,'Pot. Loss (k US$)':5307.97,'Total Loss (k US$)':67194.43}.items():
        if metrics[field] != expected: errors.append(f'Unexpected audit result: {field}')
    if errors:
        print('Verification FAILED. Review differences before using source-derived claims.')
        return 1
    print('Verification PASSED. This establishes snapshot integrity, not industrial/model validation.')
    return 0

if __name__ == '__main__': sys.exit(main())
