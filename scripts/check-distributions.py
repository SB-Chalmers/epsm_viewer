# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Sanjay Somanath
"""Check release metadata, public entrypoints, bundled resources and notices."""

import argparse
import json
import tarfile
import zipfile
from email.parser import Parser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = (
    "browser.js",
    "widget.js",
    "index.html",
    "LICENSE",
    "THREE_LICENSE",
    "THIRD_PARTY_NOTICES.md",
)


def one(directory, pattern):
    matches = list(directory.glob(pattern))
    if len(matches) != 1:
        raise ValueError(f"Expected one {pattern} in {directory}, found {len(matches)}")
    return matches[0]


def tar_bytes(archive, name):
    member = archive.extractfile(name)
    if member is None:
        raise ValueError(f"Expected regular file {name}")
    return member.read()


def check_distributions(directory):
    version = (ROOT / "VERSION").read_text().strip()
    assert json.loads((ROOT / "package.json").read_text())["version"] == version
    assets = ROOT / "python/epsm_viewer/assets"
    wheel = one(directory, "*.whl")
    sdist = one(directory, "*.tar.gz")
    npm = one(directory, "*.tgz")
    with zipfile.ZipFile(wheel) as archive:
        metadata_name = next(name for name in archive.namelist() if name.endswith("/METADATA"))
        metadata = Parser().parsestr(archive.read(metadata_name).decode())
        assert metadata["Version"] == version
        for name in ASSETS:
            assert archive.read(f"epsm_viewer/assets/{name}") == (assets / name).read_bytes()
        licenses = metadata_name.removesuffix("METADATA") + "licenses/"
        for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
            assert archive.read(licenses + name) == (ROOT / name).read_bytes()
    with tarfile.open(sdist) as archive:
        prefix = f"epsm_viewer-{version}/"
        assert tar_bytes(archive, prefix + "VERSION").decode().strip() == version
        assert json.loads(tar_bytes(archive, prefix + "package.json"))["version"] == version
        assert tar_bytes(archive, prefix + "build_backend.py")
        metadata = Parser().parsestr(tar_bytes(archive, prefix + "PKG-INFO").decode())
        assert metadata["Version"] == version
        for name in ASSETS:
            assert (
                tar_bytes(archive, prefix + "python/epsm_viewer/assets/" + name)
                == (assets / name).read_bytes()
            )
    with tarfile.open(npm) as archive:
        assert json.loads(tar_bytes(archive, "package/package.json"))["version"] == version
        assert tar_bytes(archive, "package/VERSION").decode().strip() == version
        for name in ("index.js", "geometry.js", "index.d.ts", "geometry.d.ts"):
            assert tar_bytes(archive, "package/dist/" + name)
        for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
            assert tar_bytes(archive, "package/" + name) == (ROOT / name).read_bytes()
        for name in ASSETS:
            assert (
                tar_bytes(archive, "package/dist/standalone/" + name)
                == (assets / name).read_bytes()
            )
    print(f"Verified npm, wheel and sdist version {version}, entrypoints, resources and licenses")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=ROOT / "dist")
    check_distributions(parser.parse_args().directory)
