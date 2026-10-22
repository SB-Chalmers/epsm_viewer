# EPSM Viewer

<!-- EPSM introduction: Pocket CAD -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/welcome/epsm_viewer-dark.png">
  <img src="docs/assets/welcome/epsm_viewer.png" width="160" height="160" alt="EPSM Viewer — An inspection lens around the same open building cell; scene inspection and rendering.">
</picture>

Take a closer look at your building in 3D. EPSM Viewer displays supplied EPSM
scenes in web applications and Python notebooks, with selection, camera controls
and display filters. The owning modelling packages supply the physical geometry
and scientific results.

**[Explore the EPSM platform →](https://github.com/SB-Chalmers/epsm/blob/main/docs/platform.md)**
<!-- /EPSM introduction -->

[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/SB-Chalmers/epsm_viewer/actions/workflows/ci.yml) [![Releases](https://img.shields.io/badge/releases-GitHub-181717?logo=github&logoColor=white)](https://github.com/SB-Chalmers/epsm_viewer/releases) [![Issues](https://img.shields.io/badge/issues-GitHub-181717?logo=github&logoColor=white)](https://github.com/SB-Chalmers/epsm_viewer/issues)

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

## People and support

Developed at Chalmers University of Technology as part of the EPSM research platform.

**Funding**: Swedish Energy Agency (Project ID: P2024-04053)

**Partners**:

- Lindholmen Science Park AB
- Sinom AB
- Stiftelsen Chalmers Industriteknik

**Team**:

- **Lead Developer**: Sanjay Somanath
- **Principal Investigator**: Alexander Hollberg
- **Contributors**: Yinan Yu, Dag Wästberg

<p align="center">
  <img src="docs/assets/welcome/logos.png" width="100%" alt="Chalmers University of Technology, Chalmers Industriteknik, Sinom, Lindholmen Science Park and Swedish Energy Agency logos">
</p>
