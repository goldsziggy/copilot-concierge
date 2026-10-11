#!/usr/bin/env python3
"""Create a portable ZIP from a validated staging tree; no external modules."""
from pathlib import Path
import sys
import zipfile

source = Path(sys.argv[1]).resolve()
target = Path(sys.argv[2]).resolve()
if target == source or source in target.parents:
    raise SystemExit("Archive must be outside staging tree")
with zipfile.ZipFile(target, "x", compression=zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(source.rglob("*")):
        if file.is_symlink():
            raise SystemExit(f"Refusing symbolic link: {file}")
        if file.is_file():
            info = zipfile.ZipInfo("copilot-concierge/" + file.relative_to(source).as_posix(), (2026, 10, 8, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, file.read_bytes())
