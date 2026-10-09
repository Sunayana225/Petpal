# Authoritative source integration

## Implemented

- [x] Import factual metadata from the [FDA animal/veterinary recall listing](https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals).
- [x] Preserve notice URLs, retrieval timestamp, source content hash and US geography.
- [x] Label coverage as a partial displayed-page snapshot, including medicines and supplements. It is not a complete registry.
- [x] Preserve terminated status; an unmarked notice may be ongoing or completed.
- [x] Reject schema changes, foreign notice links, duplicate rows and oversized downloads; preserve the previous snapshot on refresh failure.
- [x] Serve `GET /api/recalls?q=brand&limit=20&offset=0`, with optional `status=terminated|not-marked-terminated`, pagination and ETags.
- [x] Add parser and API regression tests and an explicit refresh command.

Refresh: `npm run sync:recalls --workspace @petpal/backend`. The snapshot is loaded at process startup; restart the API after a refresh. No automatic refresh is configured. Always inspect each original notice for affected lot numbers, dates and instructions. A missing match is not a safety clearance.

FDA [website policy](https://www.fda.gov/about-fda/about-website/website-policies) permits reuse of public-domain FDA content unless otherwise noted. We store listing facts and link to notices; company notice text, logos and photographs are not bulk copied.

## Next integrations

- [x] Refresh the explicitly licensed [BioVet dataset](https://github.com/Bio-Vet/pet-food-safety) at pinned revision `5cee4b35844d253d53b58683d10648e90833cee8`.
- [x] Retain per-item references, English aliases, publisher group mapping and provenance receipts through repository merges.
- [x] Attribute “Data: BioVet veterinary clinic network, bio.vet” under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), documenting transformations.
- [x] Label BioVet's review claim as publisher-reported, not independently verified by PetPal; remove inferred severity and unsupported review claims in the legacy importer.
- [x] Display expandable source evidence receipts on the web result card, identifying publisher-reported review claims.
- [ ] Add owner-facing recall search to the web application.
- [ ] Investigate an official complete FDA export before expanding beyond the displayed-page snapshot.

## Reference-only sources

[ASPCA terms](https://www.aspca.org/about-us/legal-information) restrict copying its database without permission. Keep ASPCA as a linked reference, not a new bulk import. Existing legacy imports require provenance review; local storage and administrative approval do not establish veterinarian review.

Do not use openFDA animal drug adverse-event reports as a pet-food recall registry. Do not treat product-catalog presence as a food-safety verdict.

BioVet transformation receipts are available in check response `details.evidence` and dataset `fields=evidence,aliases`. Group mappings are publisher dog→dogs, cat→cats, rabbit_rodent→rabbits/hamsters, bird→birds, reptile→turtles/lizards/snakes. These broad group mappings are disclosed in each receipt; they do not establish independent species-specific review. Raw retrieval hash and transformation notes are in `apps/backend/data/biovet-source.json`.

## Validation (2026-10-09)

Live FDA retrieval: 10 displayed listing records. Pinned BioVet retrieval: 101 items. Backend: 74 suites / 325 tests passed; lint and build passed; runtime dependency audit: zero findings. Web: lint and build passed; 13 tests passed. Browser: five tests passed, including real source receipt display and recall coverage disclosure. Full Jest run emitted a transient open-handle warning but subsequently exited with status zero.

Community Wisdom: DevRelay community research was unavailable (service not connected); source selection relied on the primary publisher pages and licensing policies linked above. No community citation is claimed.

The 12 new source tests also passed with `--detectOpenHandles`, exiting cleanly.
