# Contract fixtures

Real payloads read by tests on **both** sides of a boundary, so the app, the gateway and the CMS
cannot drift apart without a test failing ([`TESTING-STANDARD.md`](../TESTING-STANDARD.md) §2).

| File | Shape | Read by |
|-|-|-|
| `stories/*.json` | A CMS `story-data.json`, copied unchanged from `scripts/cms-stories/` | Gateway `StoryContractTest` (JSON and Firestore round trip); app `story-contract.test.ts` |
| `age-group-text-cases.json` | Which text a child sees for each age group and language | Gateway `StoryPageAgeGroupTest`; app `story-localization.test.ts` |

Change a fixture only when the contract changes, and then change both sides in the same commit.
