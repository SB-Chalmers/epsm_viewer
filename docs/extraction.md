# Viewer extraction scope

Owner: `epsm_viewer` owns browser/notebook display. `epsm_core` owns physical
geometry and neutral scene data. Studio owns its application adapters.

User-visible behaviour: a loaded Core scene can be inspected in an embedded
browser component, standalone local viewer or notebook using one renderer.

Inputs and outputs: versioned `epsm.scene/1` polygon data in metres with Z up;
selection IDs, display controls and an explicitly owned display lifecycle.

Delegated responsibilities: the producer supplies physical geometry, sources,
diagnostics, component identities, material information and coordinate metadata.
The host application supplies network access and decides what edits mean.

Excluded behaviour: no simulation, database/weather acquisition, model editing,
authentication, project storage, application adapters or automatic deployment.

Acceptance scenarios:

1. A weather-independent Core draft reaches the renderer unchanged.
2. Opaque drawing triangles exclude window openings; concave and courtyard
   surfaces preserve their independently expected areas and full context shell.
3. Picking retains IDs and untrusted source text stays text.
4. Empty drafts, multiple instances, replacement and repeated disposal work.
5. Standalone files and notebook widgets use the same offline renderer.
6. Installed npm and Python artifacts contain the required files and notices;
   neither package imports Core at runtime.

The scene schema and synthetic fixture were exported through an installed Core
0.8.0 wheel built from released main
`b197e092eb0423de5a9547873a0f596493ab7536` (`v0.8.0`). The
[provenance record](../tests/fixtures/core-scene.provenance.json) records the
public operations, synthetic inputs and captured artifact hashes. This establishes
the stated geometry display handoff, not scientific model accuracy. Core's
previous `.view()`, `.widget()`, viewer CLI and viewer modules move out of Core.
Use `geometry.scene()` / `building.scene()` followed by
the explicitly chosen viewer display helper. Updating installed package
compatibility manifests and publishing releases remain separate release steps.

`package.json` is the version source. Tracked `VERSION`, which Python packaging
reads, and the npm lockfile must agree before building. Python packaging requires
prepared browser/widget resources and never calls Node. TypeScript public types
describe the neutral scene; they do not
copy the Core Building model or its scientific validation rules.

The private GitHub repository has `main` and `dev` initialized from the unchanged
extraction baseline. The 0.1.0 candidate still requires PR checks and coordinated
publication. See [release preparation](release.md) for private artifact installation
and remaining release gates.
