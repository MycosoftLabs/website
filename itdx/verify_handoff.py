#!/usr/bin/env python3
"""Verify handoff bytes and the exact v1.2 extraction; no network or dependencies.

This detects changes relative to MANIFEST.json. Trust in the manifest must come
from the independently reviewed Git commit/archive; hashes alone are not trust.
"""
from pathlib import Path, PurePosixPath
import hashlib
import json
import sys
import zipfile

ROOT = Path(__file__).resolve().parent


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(value):
    path = PurePosixPath(value)
    if path.is_absolute() or '..' in path.parts or '\\' in value or not path.parts:
        raise ValueError('Invalid relative manifest path')
    return ROOT.joinpath(*path.parts)


def verify():
    manifest = json.loads((ROOT / 'MANIFEST.json').read_text(encoding='utf-8'))
    errors = []
    entries = manifest['files']
    paths = [e['path'] for e in entries]
    if len(paths) != len(set(paths)):
        errors.append('Duplicate manifest paths')
    for entry in entries:
        path = safe_path(entry['path'])
        if not path.is_file() or path.is_symlink():
            errors.append('Missing or unexpected file: ' + entry['path'])
            continue
        raw = path.read_bytes()
        if len(raw) != entry['bytes'] or sha(raw) != entry['sha256']:
            errors.append('File bytes differ: ' + entry['path'])

    archive = safe_path(manifest['frozen_release']['archive'])
    snapshot_paths = set()
    with zipfile.ZipFile(archive) as z:
        for info in z.infolist():
            if info.is_dir():
                continue
            rel = PurePosixPath(info.filename).relative_to('Mycosoft_ITDX26')
            name = 'local/' + rel.as_posix()
            snapshot_paths.add(name)
            target = safe_path(name)
            if not target.is_file() or target.read_bytes() != z.read(info):
                errors.append('Frozen release mismatch: ' + name)
    manifested_snapshot = {p for p in paths if p.startswith('local/')}
    if snapshot_paths != manifested_snapshot:
        errors.append('Frozen release membership differs from manifest')
    if len(snapshot_paths) != manifest['frozen_release']['file_count']:
        errors.append('Frozen release file count differs')

    documents = json.loads((ROOT / 'local/bundled_documents/index.json').read_text(encoding='utf-8'))
    for doc in documents:
        matches = list((ROOT / 'local/bundled_documents').glob(doc['id'] + '.*'))
        if len(matches) != 1 or sha(matches[0].read_bytes()) != doc['sha256']:
            errors.append('Original document hash mismatch: ' + doc['id'])

    for name in paths:
        parts = PurePosixPath(name).parts
        if any(p in {'local_data', '__pycache__', '.itdx-venv', '.venv'} for p in parts):
            errors.append('Local machine state in manifest: ' + name)
        if PurePosixPath(name).suffix.lower() in {'.pem', '.key', '.db', '.sqlite', '.sqlite3', '.pyc'}:
            errors.append('Unexpected key/database/cache artifact: ' + name)

    result = {'status': 'FAIL' if errors else 'PASS', 'manifest_files': len(entries),
              'frozen_release_files': len(snapshot_paths), 'original_documents': len(documents),
              'errors': errors,
              'scope': 'Byte integrity and frozen release membership; not source truth, live integration, or Army acceptance.'}
    print(json.dumps(result, indent=2))
    return 1 if errors else 0


if __name__ == '__main__':
    try:
        sys.exit(verify())
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as exc:
        print(json.dumps({'status': 'FAIL', 'error': str(exc)}))
        sys.exit(1)
