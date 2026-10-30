# Contract fixtures

Real payloads read by tests on **both** sides of a boundary, so the app, the gateway and the CMS
cannot drift apart without a test failing ([`TESTING-STANDARD.md`](../TESTING-STANDARD.md) §2).

| File | Shape | Read by |
|-|-|-|
| `stories/*.json` | A CMS `story-data.json`, copied unchanged from `scripts/cms-stories/` | Gateway `StoryContractTest` (JSON and Firestore round trip); app `story-contract.test.ts` |
| `story-checksums.json` | The checksum of each story above, written by `scripts/lib/story-checksum.js` | Gateway `StoryChecksumsTest`; `scripts/lib/story-checksum.test.js` |
| `age-group-text-cases.json` | Which text a child sees for each age group and language | Gateway `StoryPageAgeGroupTest`; app `story-localization.test.ts` |
| `badge-copy-forbidden.json` | Phrases badge copy must never use | CMS `achievement-validator.js`; app `badge-copy.test.ts` |
| `badge-bundled-art.json` | Art keys a badge definition may name instead of a CMS asset | CMS `achievement-validator.js`; app `badge-copy.test.ts` (equals `ART`) |

Change a fixture only when the contract changes, and then change both sides in the same commit.
