# PetPal standout feature roadmap

Research date: 2026-10-09. All features below are **proposed**, not implemented. This roadmap is separate from the completed API improvement checklists.

## Recommended direction

Help owners move from a food verdict to a useful action: understand the evidence, check a whole ingredient list, remember household products, and share clear information with their veterinarian. The differentiation hypothesis is the combination of ten-species coverage, evidence transparency and product tracking. Research does not establish that these features are unique in the market.

The existing API already provides local batch checks, species comparisons, dataset browsing and source attribution. The new owner workflows should reuse these capabilities.

## Proposed features

| Priority | Feature | First usable version | Relative effort |
| --- | --- | --- | --- |
| 1 | Evidence receipts | Source links, source category, actual review status, reviewer identity and review dates alongside every result. | Medium |
| 2 | Ingredient-list checker | Paste a label or recipe, confirm extracted ingredients and see separate verdicts, including unresolved ingredients. | Medium |
| 3 | Pet profiles and household pantry | Save several pets and products; display a species-by-item matrix using existing checks and comparisons. | Medium |
| 4 | Product recall watchlist | Match saved brand, product and lot details against official notices; show affected items in an in-app inbox. | Medium–large |
| 5 | Vet handoff report | Record owner-reported exposure details and export a concise timeline with sources and the household's saved vet contact. | Medium |
| 6 | Offline reviewed-data pack | A limited, signed, versioned reviewed subset with visible freshness and local lookup. | Medium |
| 7 | Barcode and label scanning | Camera barcode lookup and editable OCR, followed by ingredient confirmation and a pantry entry. | Large |
| 8 | Partner checker widget | An accessible embeddable checker for shelters, rescue groups and pet shops, with attribution and integration examples. | Medium–large |

Effort is relative to this repository, not a delivery-time commitment.

## Acceptance criteria and dependencies

1. **Evidence receipts:** distinguish curated, imported, generated and AI records. An admin approval alone is human review; veterinary badges require verified reviewer credentials. Avoid invented confidence percentages. Audit generated seeds and production pending-answer policy before stronger trust claims. Some older README/UI prose needs updating to match SQLite storage and actual source categories.
2. **Ingredient checks:** owners confirm parsed text; unknown ingredients remain visible. Reuse bounded local batches initially. Individual ingredient verdicts do not establish recipe completeness, safe quantities or combination safety.
3. **Profiles and pantry:** owner-scoped access, export/deletion and optional user-entered allergy notes. Species-level checks must not become unsupported personalized medical recommendations. Include bookmarks and check history.
4. **Recalls:** begin with one explicitly labelled geography and maintained official source. Match product identifiers and lots; explain uncertain matches. Display notice links, status and synchronization freshness. No match is not proof of safety. Start with in-app alerts; external notifications need explicit opt-in and a configured provider. Animal drug adverse-event data must not be mistaken for pet-food recall data.
5. **Handoff:** surface the saved professional contact before an optional form. Reports distinguish owner observations, database results and AI output. Do not introduce automatic diagnosis, treatment or dosing. Contact information must be appropriate for the owner's country.
6. **Offline:** verify signatures and update bundles atomically. Reject tampered data, show stale content and preserve unknowns. Clearly state that live recalls and remote results are unavailable offline.
7. **Scanning:** the API already integrates Open Pet Food Facts; camera capture and OCR are new client work. Owners must confirm uncertain text/product variants. Include manual fallback, permissions and bounded image retention. A brand or category match alone cannot establish safety.
8. **Widget:** reuse public checks with visible evidence. Privileged API secrets stay on a partner backend. Add partner roles and signed change webhooks only after a real integration needs them.

## Suggested first milestone

Build evidence receipts, then pet profiles and the pasted-text ingredient checker. This combines trust, repeat use and a visibly new owner workflow using the existing API. Validate a clickable prototype with a small owner group before investing in OCR or notification infrastructure. Measure evidence comprehension, unresolved-ingredient visibility, repeated pantry use and wrong-product corrections. Clinical accuracy needs separate qualified review.

## Research

- [Pawp membership features](https://help.pawp.com/en/articles/14463252-what-does-my-pawp-membership-include) include pet profiles and access to veterinary professionals. Profiles and generic chat are established capabilities, so profiles are a useful foundation rather than proof of differentiation.
- [Chewy virtual veterinary visits](https://www.chewy.com/pethealth/connect-with-a-vet/virtual-visit) demonstrate an existing professional-care offering. Operating live vet access requires staffing and operations beyond a chat interface.
- [FDA Animal & Veterinary recalls and withdrawals](https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals) provide an authoritative US starting point. Geographic and identifier coverage must remain explicit.
- Repository review: web/mobile page inventory, API-200-GUIDE.md and externalApiService.ts. Camera scanning, profiles and these owner workflows are future work.
- Community Wisdom research was unavailable because the installed DevRelay gateway requires an account connection; no community consensus is claimed.
