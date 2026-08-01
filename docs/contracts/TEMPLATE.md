# Contract: <feature-slug>

> Copy this file to `docs/contracts/<feature-slug>.md`. The architect fills every
> section; implementation agents build from this text alone. Empty sections are
> written as "None" — never deleted.

## Directive

<The arbiter/operator's original ask, verbatim.>

## Status

| Field | Value |
|---|---|
| Architect | pending / done |
| Backend | pending / in progress / done |
| UX spec | pending / done — `docs/ux/<feature-slug>.md` |
| UI | pending / in progress / done |
| QA | round N — SHIP / DEFECTS FOUND / BLOCKED — `docs/qa/<feature-slug>-round-<n>.md` |

## API contract

<Every endpoint. Backend and UI both build from this text alone.>

### `<METHOD> /api/v1/...`

- Auth: <JWT required? role?>
- Request:
```json
{}
```
- Response `200`:
```json
{}
```
- Errors: <status → shape>

## Model sync

<Java and TypeScript sides, together. Any model change is a two-side change.>

| Java (`gateway-service/...`) | TypeScript (`grow-with-freya/...`) |
|---|---|
| `record Example(String id)` | `interface Example { id: string }` |

## File ownership

<No two agents share a path. Disputes are contract defects, not negotiations.>

- **Backend** (`backend-engineer`): `gateway-service/...`
- **UX** (`ux-designer`): `docs/ux/<feature-slug>.md`
- **UI** (`ui-engineer`): `grow-with-freya/...`
- **Shared** (contract-only, edited by architect): this file

## Acceptance criteria

<Mechanically checkable only. QA walks these one by one.>

1. `cd gateway-service && ./gradlew test` passes.
2. `cd grow-with-freya && npm run validate` passes.
3. Functional scenarios below pass (`func-tests`, full stack or CI).
4. <Endpoint X returns Y for input Z.>
5. <Screen renders all four states: loading / error / empty / success.>

## Functional test scenarios

<Business-language scenario titles, written by the architect. QA implements them as
Cucumber features in `func-tests/` and integration tests — this list is the coverage
floor, not the ceiling. Include error and edge scenarios (auth failure, tier caps,
offline), not just happy paths.>

- <e.g. "A signed-in user bookmarks a story and sees it on the Favourites shelf">
- <e.g. "A Free-tier user hitting the bookmark cap is shown the upgrade path">
- <e.g. "Bookmarking while offline syncs when the device reconnects">

## Open questions

<Agents append here instead of guessing or asking. Orchestrator resolves or
escalates to the operator. Format: `- [ ] (from <agent>) question` — checked off
with the resolution written inline.>

None.
