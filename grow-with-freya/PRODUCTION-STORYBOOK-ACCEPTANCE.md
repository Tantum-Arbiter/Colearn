# Production storybook integration — 2026-09-09

Companion generator branch: `codex/production-spec-completion` in ai-tools.
Consumer branch: `codex/storybook-production-reader`, based on local `mvp` commit
`5540b69`. Original CoLearn checkout and unrelated uncommitted work are preserved.

Implemented:

- Landscape narration is on the right; portrait keeps the previous layout.
- Text and language-comparison panels remain scrollable within the viewport.
- Protected full-scene overlays never scale during reveal/hide.
- Page-specific component keys reset props when different pages reuse an ID.
- Prop hit targets expose accessible button labels and expanded state.

Validation:

- Targeted renderer, prop and narration-layout tests pass, including actual reader
  mounting in landscape, normalized hit placement, and reveal/hide alignment.
- TypeScript project check passes. The complete story component test subtree passes: 253 tests across 18 suites.
- An isolated native harness imported the real interaction component and narration
  layout, and rendered the generator's delivered WebP files on an iPad simulator.
  Right-side narration was visually inspected. The simulator was subsequently used by
  another session; this run does not claim complete phone/tablet acceptance of the
  full reader, every animation frame, or a production manuscript.
- Generator integration tests compile packages against the actual consumer Story type
  and validate the local CMS schema. Browser package review tests open/reset delivered
  overlays with tablet and landscape-phone geometry.

Before a book is marked ready, run the complete delivered package in the native reader
on both target devices: verify narration/controls, text at large settings, tap size,
repeat reveal/hide, page reset, and seams throughout animation. Attach evidence to that
book's source-and-contract-bound production review. No book was marked ready, uploaded,
or published in this implementation session.
