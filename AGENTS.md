# Working on epsm_viewer

Follow the EPSM developer handbook for clear ownership, public APIs, test-first
changes, explicit I/O, truthful attribution and MIT/third-party notices.

This package renders loaded neutral scenes. Keep physical geometry/model rules
in their owning library and application adapters in Studio. Do not add Core as a
runtime dependency or make display silently fetch, save or simulate.

Use `npm test` for contract/geometry checks, `npm run test:browser` for actual
rendering and `python -m pytest tests/python` for optional display helpers. Build
and inspect both npm and Python artifacts. A missing required browser or notebook
integration remains unverified.

The current extraction uses the user's main-only source baseline. Do not merge,
publish or deploy as part of an ordinary local change without authorization.
