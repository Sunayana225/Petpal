# API expansion guide

The next 200 improvements are tracked individually in [API-200-IMPROVEMENTS.md](API-200-IMPROVEMENTS.md). They are API behavior improvements, not a promise of 200 unrelated endpoints or 200 commits. The implementation uses cohesive modules and regression suites.

## Compatibility

Existing single checks and response identity fields remain available. Single checks now reject non-string values, unsupported fields, controls, invalid food punctuation and ambiguous duplicate query values. NFKC compatibility characters and repeated spaces are normalized before lookup. The legacy `animal` alias uses the same validation as `pet`; contradictory aliases return 400.

Dataset lists now default to **100 records**. `count` is the returned page count; `pagination.total` is the full filtered count. Search now returns all name matches using substring terms by default, instead of at most one exact hit per species. Use `match=exact` for exact normalized food names. Dataset `stats` uses a stable `revision` instead of a per-request timestamp, allowing useful ETags. Unsupported species in dataset filters return 400; single auto checks still permit readable species without curated coverage.

## Credentials and quotas

Set `Authorization: Bearer <key>` on dataset, bulk and versioned check routes. The same key/account/burst admission rules apply on both mounts. `batch-check` and `compare` require `check` or `food-safety` scope. `foods`, `search`, `lookup`, `metadata` and other dataset routes require `dataset` or `food-safety` scope. One admitted batch counts as one request; batches cannot invoke paid or external sources. Conditional responses still authenticate and consume one quota admission.

Cookie console mutations continue requiring CSRF. An admin token can call `/api/admin/cache` and review routes; browser admin sessions require their CSRF token on mutations.

## Checks

```powershell
Invoke-RestMethod -Method Post -Uri "$api/api/food-safety/check" -ContentType 'application/json' -Body '{"pet":"dog","food":"chocolate","mode":"local"}'
Invoke-RestMethod -Uri "$api/api/check?animal=dog&food=chocolate&mode=local"
```

Set `$api` to your running API origin. `mode` is `auto` (default) or `local`. Local mode only consults local records, returns `unknown` when absent, and cannot accept `X-Gemini-Key`. Auto checks retain the existing remote fallback. Local means the packaged index, which contains curated, imported and generated seed records; it does not imply every record received human veterinary approval. Check each record’s source attribution. A Gemini key must contain 10–200 letters, digits, underscores or hyphens.

## Bulk local checks

```powershell
$headers = @{ Authorization = "Bearer $key" }
Invoke-RestMethod -Method Post -Uri "$api/api/v1/food-safety/batch-check" -Headers $headers -ContentType 'application/json' -Body '{"items":[{"pet":"dog","food":"chocolate"},{"pet":"cat","food":"apple"}]}'
Invoke-RestMethod -Method Post -Uri "$api/api/v1/food-safety/compare" -Headers $headers -ContentType 'application/json' -Body '{"food":"chocolate","pets":["dog","cat"]}'
```

Batch input is 1–20 `{pet,food}` objects, optionally with `mode:"local"`. All inputs validate before lookups; results retain order and include `inputIndex`, `count`, `uniqueChecks`, revision and request ID. Duplicate normalized pairs share the local result when their displayed input agrees. A comparison accepts 1–10 supported distinct species, treating `dog` and `dogs` as duplicates. It returns ordered `results`, `bySafety`, and `consistent` (agreement including unknowns). Neither route accepts Gemini keys, and neither issues remote calls. An absent local food is unknown, never inferred safe.

## Dataset browsing

```powershell
$page = Invoke-RestMethod -Uri "$api/api/v1/food-safety/foods?pet=dog&safety=unsafe&limit=10&fields=source,symptoms" -Headers $headers
$page.pagination
$cursor = [uri]::EscapeDataString($page.pagination.nextCursor)
Invoke-RestMethod -Uri "$api/api/v1/food-safety/foods?pet=dog&safety=unsafe&limit=10&fields=source,symptoms&cursor=$cursor" -Headers $headers
```

Keep filters, projection and ordering unchanged when following a cursor. Species aliases normalize to the same filter. Cursors are opaque positioning tokens, not authentication credentials; they are bound to the representation filters and content revision. A changed dataset returns **409** and requires restarting. Different filters or malformed cursors return **400**. Use cursor or offset; offset must be 0–100000, and limit 1–100 with canonical decimal syntax. Page-size changes are permitted with the same cursor.

Supported filters: `pet`, `safety=safe|caution|unsafe`, `severity=low|medium|high`, case-insensitive source substring, `q`, `match=contains|prefix|exact`, and `has=symptoms|benefits|alternatives|preparation|recommendation|ingredients`. Contains matching requires every normalized query term in the food name. `sort=food|pet|safety|severity|source` supports `order=asc|desc`; safety and severity use numeric risk rank. Missing severity sorts below low. Stable species and food tie breakers prevent page drift. A category path cannot be combined with a contradictory safety or species filter.

`fields` accepts up to 10 unique documented names. Food, species and safety always remain, regardless of projection; missing optional values are omitted. `/metadata` publishes the full list. `/safe/:pet`, `/caution/:pet`, `/unsafe/:pet`, `/search`, and `/foods` share filters, sorting and pagination. `/autocomplete?q=choc` uses prefix matching, has a 20-record cap and rejects other match modes. Next-page `Link` is a relative URL; clients must resolve it against the API origin.

`/lookup?pet=dog&food=apple` provides a local single answer with variant lookup and never issues remote calls. Its optional mode can only be `local`.

## Summaries and discovery

`/summary` accepts the same filters and reports total, distinct food labels, counts by species/safety/severity/source, and detail coverage. It rejects paging, sorting and projection options because it aggregates all matches. `/sources` gives sorted attribution counts; `/species` provides category coverage per species. `/metadata` gives revision, fields, filters, matches, sorts, orders, limits and paging strategies. `/pets`, `/stats`, `/sources`, `/species` and `/metadata` accept no query options. All are keyed, and `/api/info` advertises the public capabilities without exposing dataset records.

## HTTP contracts

Dataset responses have a strong content-derived `ETag`, `X-Dataset-Revision`, `Vary: Authorization`, and `Cache-Control: private, max-age=0, must-revalidate`. `If-None-Match` supports strong, weak, wildcard and list validators; unchanged content returns an empty **304**. `If-Match` requires a matching strong tag or wildcard, otherwise **412**. Both require fresh authentication. Check and bulk responses are not conditional dataset representations.

Errors retain `code`, `errorCode`, request ID and timestamp and always use `no-store`. Clients may prefer `Accept: application/problem+json, application/json;q=0.9` for problem details while accepting successful JSON. Unknown response media types return **406**. Food-safety mutation bodies require uncompressed JSON (**415** otherwise). Bodies on GET/HEAD, duplicate/bracket/control query parameters, method-override headers, more than 20 query parameters and URLs over 4096 bytes are rejected. Known routes return **405** with `Allow`; CORS preflight remains handled before API contracts. CORS exposes correlation, version, quota, ETag, revision and Link headers and caches preflights for 600 seconds.

## Cache and moderation operations

Memory caches now enforce finite TTLs, least-recently-used capacity, and a limit on distinct concurrent factories. Same-key callers coalesce even when that limit is reached. Saturation returns **503**, `Retry-After: 1`; rejected factories release their slots. Delete/clear/explicit writes invalidate factory ownership, so an old completion cannot restore cleared values or remove newer work. Diagnostics include hits, misses, coalescing, evictions, expirations, live entries, in-flight factories and hit ratio; `has()` does not count as a cache hit.

Filtered dataset pages use a bounded 32-query memory cache keyed by filters and revision, so subsequent pages reuse the same sorted snapshot. Admin `GET /api/admin/cache` reports answer and dataset memory caches plus durable review counts. `DELETE /api/admin/cache` clears only process memory, preserving review records. Review changes increment a SQLite revision observed by every process on its next lookup. Pending-serving policy changes invalidate both hot layers. Hot durable entries cannot outlive their row. Approved and rejected records cannot be overwritten by fresh captures; rejected decisions are permanent until explicitly changed, serve as unknown and prevent repeated paid lookups. Approval of an unknown cached answer returns **409**. The review queue supports limit (1–100, default 50) and offset (0–100000) with deterministic time/ID ordering.

Schema migration 4 adds the review revision table/triggers and queue index and preserves existing rows. Back up your SQLite database before routine production updates as described in OPERATIONS.md. This change publishes source code; it does not deploy or verify live OAuth/AI credentials.

## References and evidence

HTTP validation and conditional semantics follow [HTTP Semantics](https://httpwg.org/specs/rfc9110.html). Framework behavior was checked against [Express 5 documentation](https://expressjs.com/en/5x/api/). Regression evidence is in `apiInputContracts`, `apiBatchContracts`, `apiDatasetContracts`, `apiCacheContracts`, `apiModerationContracts` and `apiHttpContracts` test suites. The installed DevRelay Community Wisdom research service returned an account-connection error; no community claims or citations are invented.
