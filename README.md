# epsm_viewer

[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/SB-Chalmers/epsm_viewer/actions/workflows/ci.yml) [![Releases](https://img.shields.io/badge/releases-GitHub-181717?logo=github&logoColor=white)](https://github.com/SB-Chalmers/epsm_viewer/releases) [![Issues](https://img.shields.io/badge/issues-GitHub-181717?logo=github&logoColor=white)](https://github.com/SB-Chalmers/epsm_viewer/issues)

EPSM Viewer renders building geometry and inspection evidence in interactive 3D
views for web applications and Python notebooks. It accepts loaded EPSM scenes
and provides selection, camera controls and display filters. Physical geometry
and scientific calculations stay in the packages that produce those scenes.

## Getting started

Use Node.js 22 and npm, plus Python 3 to serve the browser example. Clone the repository to begin:

```sh
git clone https://github.com/SB-Chalmers/epsm_viewer.git
cd epsm_viewer
npm ci
npm run build
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [the browser example](http://127.0.0.1:8000/examples/01_browser.html) to inspect
the supplied synthetic scene. No database, weather file or simulation engine is needed.

For optional Python display, use Python 3.11 or newer. In another terminal at the
repository root, create an environment after building the browser assets:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install '.[notebook]'
```

Try the [GeometrySpec.scene() example](docs/guide.md#optional-python-display) with
Core installed. Run `npm test` for geometry checks; the guide covers other checks.

## Documentation

- [Examples](examples/README.md)
- [Browser and Python APIs](docs/guide.md)
- [Scene contract and package scope](docs/extraction.md)
- [Building and installing artifacts](docs/release.md)
- [Continuous integration](docs/ci.md)

## License

EPSM-owned software uses the [MIT license](LICENSE). Original extraction attribution
and bundled Three.js notices are retained in [third-party notices](THIRD_PARTY_NOTICES.md).
