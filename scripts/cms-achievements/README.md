# Badge definitions

One JSON file per badge, named after its `id` (`theme-calming.json`). The format is
[`../achievement-schema.json`](../achievement-schema.json); the app's evaluator reads it
(`grow-with-freya/components/progress/achievements.ts`).

- Change a badge's rule or copy by raising its `version`. The app keeps the bundled copy of a badge
  until a CMS version at least as high arrives.
- Retire a badge with `"status": "retired"` rather than deleting the file: families who earned it
  keep it, and nobody else sees it.
- `art` is either a CMS asset path (`assets/badges/calming.webp`, uploaded with the story assets)
  or one of the art keys the app carries (`contract-fixtures/badge-bundled-art.json`).
- Copy lines (`title`, `earned`, `next`) must carry the same languages, and must not use the
  phrases in `contract-fixtures/badge-copy-forbidden.json`.

Check with `npm run cms -- achievements` in `cms-manager/`. Upload with
`node upload-achievements-to-firestore.js` (a dry run; add `--apply` to write).
