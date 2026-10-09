# 200 further API improvements

These are 200 concrete API behaviors grouped into 20 implementation areas. All 200 checklist behaviors are implemented and validated. Bulk checks are deliberately local-only; they do not multiply paid upstream calls.

## Single-check input contracts

1. [x] Reject non-object check bodies
2. [x] Reject array check bodies
3. [x] Require string pet values
4. [x] Require string food values
5. [x] Reject control characters in pet names
6. [x] Reject control characters in food names
7. [x] Normalize compatibility Unicode inputs
8. [x] Collapse internal input whitespace
9. [x] Reject unsupported check fields
10. [x] Offer local-only single checks with mode=local

## Legacy check consistency

11. [x] Validate required legacy food
12. [x] Validate required legacy species
13. [x] Bound legacy food length
14. [x] Bound legacy species length
15. [x] Accept the legacy animal alias through shared parsing
16. [x] Reject conflicting pet and animal inputs
17. [x] Apply identical food character rules to legacy checks
18. [x] Support local mode on the legacy route
19. [x] Reject unknown legacy query fields
20. [x] Return shared correlated validation errors for legacy calls

## Bounded batch checks

21. [x] Add keyed POST batch-check
22. [x] Require a nonempty batch array
23. [x] Cap each batch at 20 checks
24. [x] Validate every item before executing any check
25. [x] Preserve batch input order
26. [x] Expose inputIndex on batch results
27. [x] Deduplicate normalized batch pairs
28. [x] Return the uniqueChecks count
29. [x] Keep batch lookups local to prevent upstream amplification
30. [x] Reject Gemini credentials on batch requests

## Species comparison

31. [x] Add keyed POST compare
32. [x] Require comparison food strings
33. [x] Require 1–10 comparison species
34. [x] Reject unsupported comparison species
35. [x] Reject duplicate species aliases
36. [x] Preserve comparison species order
37. [x] Group comparison results by safety
38. [x] Report whether comparison verdicts agree
39. [x] Keep comparisons local to the packaged dataset
40. [x] Reject Gemini credentials on comparisons

## Dataset browsing

41. [x] Add unified foods endpoint
42. [x] Browse across all supported dataset species
43. [x] Browse one species using pet aliases
44. [x] Return explicit pagination metadata
45. [x] Return dataset revision with food pages
46. [x] Bound safe category lists
47. [x] Bound caution category lists
48. [x] Bound unsafe category lists
49. [x] Add local lookup endpoint
50. [x] Reject path and query species conflicts

## Dataset filters

51. [x] Filter records by safety
52. [x] Filter records by severity
53. [x] Filter by source text
54. [x] Filter by multiple food search terms
55. [x] Support exact normalized name matching
56. [x] Support prefix name matching
57. [x] Filter records containing symptoms
58. [x] Filter records containing benefits
59. [x] Filter records containing alternatives
60. [x] Filter records containing preparation

## Dataset sorting

61. [x] Sort by normalized food name
62. [x] Sort by canonical pet species
63. [x] Sort safety by risk rank
64. [x] Sort severity by severity rank
65. [x] Sort by source attribution
66. [x] Support ascending order
67. [x] Support descending order
68. [x] Use species as a stable tie breaker
69. [x] Use food as a stable final tie breaker
70. [x] Reject unknown sort keys and directions

## Offset pagination

71. [x] Default dataset pages to 100 records
72. [x] Cap dataset page size at 100
73. [x] Reject zero page size
74. [x] Reject negative offsets
75. [x] Reject fractional pagination values
76. [x] Reject exponent-form pagination values
77. [x] Reject padded numeric pagination values
78. [x] Cap dataset offsets at 100000
79. [x] Report full filtered total separately from page count
80. [x] Return empty pages beyond the dataset end

## Revision-bound cursors

81. [x] Offer opaque nextCursor tokens
82. [x] Report hasNext on pages
83. [x] Return null cursor at the end
84. [x] Require cursor version 1
85. [x] Reject malformed cursor encoding
86. [x] Bound cursor byte length
87. [x] Reject unsafe cursor offsets
88. [x] Reject mixed cursor and offset requests
89. [x] Reject cursors for a changed dataset
90. [x] Reject cursors reused with different filters

## Record projection

91. [x] Offer fields projection
92. [x] Always retain food identity in projections
93. [x] Always retain species identity in projections
94. [x] Always retain safety verdict in projections
95. [x] Cap requested projection fields at 10
96. [x] Reject duplicate projection fields
97. [x] Reject unknown projection fields
98. [x] Omit absent optional projected fields
99. [x] Project optional symptom arrays
100. [x] Project source attribution without full record payloads

## Search and autocomplete

101. [x] Return all substring food matches rather than one per species
102. [x] Paginate search results
103. [x] Apply dataset filters to search
104. [x] Apply stable sorting to search
105. [x] Require nonempty search queries
106. [x] Cap search queries at 100 characters
107. [x] Add prefix autocomplete endpoint
108. [x] Cap autocomplete pages at 20
109. [x] Reject conflicting autocomplete match modes
110. [x] Expose next-page Link headers

## Conditional dataset responses

111. [x] Compute content-derived strong ETags
112. [x] Return 304 for matching If-None-Match
113. [x] Support weak If-None-Match validators
114. [x] Support wildcard If-None-Match
115. [x] Support comma-separated conditional validators
116. [x] Honor strong If-Match preconditions
117. [x] Reject stale If-Match with 412
118. [x] Use private mandatory revalidation for keyed datasets
119. [x] Vary dataset representations by Authorization
120. [x] Authenticate conditional requests before returning 304

## Dataset metadata

121. [x] Add dataset metadata endpoint
122. [x] Publish dataset total entries in metadata
123. [x] Publish actual supported dataset species in metadata
124. [x] Publish selectable record fields
125. [x] Publish supported filter names
126. [x] Publish supported match modes
127. [x] Publish supported sort keys
128. [x] Publish supported ordering directions
129. [x] Publish page and batch size limits
130. [x] Publish supported pagination strategies

## Filtered summaries and provenance

131. [x] Add filterable summary endpoint
132. [x] Report summary total matches
133. [x] Report distinct matching food names
134. [x] Report per-species match counts
135. [x] Report per-safety match counts
136. [x] Report per-severity match counts including unspecified
137. [x] Report per-source match counts
138. [x] Report counts with symptoms and alternatives and preparation
139. [x] Add sorted source attribution counts endpoint
140. [x] Add species coverage counts endpoint

## Cache capacity and visibility

141. [x] Validate positive cache entry capacity
142. [x] Validate positive concurrent-factory capacity
143. [x] Reject nonfinite cache TTL values
144. [x] Evict least recently used records
145. [x] Invalidate old entries when TTL is zero
146. [x] Prune expired cache entries explicitly
147. [x] Report live cache size after pruning
148. [x] Report cache evictions and expirations
149. [x] Report concurrent factory count and capacity
150. [x] Report cache hit ratio without has() changing hit counters

## Cache concurrency correctness

151. [x] Cap distinct simultaneous cache factories
152. [x] Coalesce same-key factories before applying capacity cap
153. [x] Capture synchronous factory throws as rejected promises
154. [x] Remove failed factories for retries
155. [x] Prevent cleared factories repopulating the cache
156. [x] Prevent deleted factories repopulating the cache
157. [x] Prevent old factories removing newer same-key work
158. [x] Make explicit writes supersede pending factories
159. [x] Expose admin cache diagnostics
160. [x] Expose admin cache reset without deleting durable review records

## Moderation cache integrity

161. [x] Invalidate service caches when review decisions change
162. [x] Detect review invalidation across API processes
163. [x] Invalidate hot durable caches when serving policy changes
164. [x] Keep hot-cache TTL within durable expiry
165. [x] Preserve approved payloads against fresh captures
166. [x] Preserve rejected payloads against fresh captures
167. [x] Make rejection permanent until an explicit review decision
168. [x] Serve rejected records as unknown without another paid call
169. [x] Add bounded deterministic review-queue pagination
170. [x] Reject approval of unknown cached verdicts

## HTTP request contracts

171. [x] Reject duplicate scalar query parameters
172. [x] Reject bracket-shaped query parameters
173. [x] Reject query control characters
174. [x] Cap API query parameter counts
175. [x] Cap API URL byte length
176. [x] Reject HTTP method override headers
177. [x] Reject bodies on food-safety GET and HEAD requests
178. [x] Require JSON food-safety mutation bodies
179. [x] Reject compressed food-safety request bodies
180. [x] Return 406 for unsupported response Accept types

## Transport and error handling

181. [x] Expose API version response header
182. [x] Expose correlation and dataset headers through CORS
183. [x] Cache CORS preflight decisions for 600 seconds
184. [x] Return 405 and Allow for unsupported check methods
185. [x] Return 405 and Allow for unsupported dataset methods
186. [x] Return 405 and Allow for unsupported bulk methods
187. [x] Prevent caching all JSON errors
188. [x] Offer RFC problem+json error responses
189. [x] Return bearer authentication challenges on key failures
190. [x] Return retryable 503 on cache concurrency saturation

## Discovery and operational contracts

191. [x] Advertise new API capabilities at info
192. [x] Use runtime API version in OpenAPI
193. [x] Document batch request and result schemas
194. [x] Document comparison request and result schemas
195. [x] Document dataset filtering and sorting parameters
196. [x] Document cursor pagination and stale revisions
197. [x] Document conditional response statuses and headers
198. [x] Document local-only lookup and bulk semantics
199. [x] Document compatibility changes and runnable API examples
200. [x] Add executable contract validation for new discovery paths and limits

## Implementation and validation evidence

The implementation is grouped into cohesive API modules; these are 200 concrete behavior improvements across 20 areas, rather than 200 unrelated endpoints. Read [API-200-GUIDE.md](API-200-GUIDE.md) for client migration, source attribution, request examples, and operating instructions.

| Checklist items | Implementation | Regression evidence |
| --- | --- | --- |
| 1–20 | foodSafety/input.ts, check.ts, routes/index.ts | apiInputContracts.test.ts |
| 21–40 | foodSafety/batch.ts, apiKeyAuth.ts | apiBatchContracts.test.ts |
| 41–110 | foodSafety/dataset.ts, datasetQuery.ts | apiDatasetContracts.test.ts |
| 111–120 | utils/conditionalJson.ts and authenticated dataset mounts | apiDatasetContracts.test.ts |
| 121–140 | dataset metadata, sources, species and filtered summary handlers | apiDatasetContracts.test.ts |
| 141–160 | utils/cache.ts and admin cache handlers | apiCacheContracts.test.ts, apiHttpContracts.test.ts, apiModerationContracts.test.ts |
| 161–170 | migration 4, repositories/aiAnswerRepository.ts, answerCache.ts, foodSafetyService.ts | apiModerationContracts.test.ts, including independent SQLite connections |
| 171–190 | apiContract.ts, app.ts, errorEnvelope.ts, method handlers | apiHttpContracts.test.ts |
| 191–200 | config/openapi.ts, API discovery, API-200-GUIDE.md | apiHttpContracts.test.ts |

Validation on 2026-10-09:

- Full backend run: 72 suites / 311 tests passed with `--runInBand --detectOpenHandles`; no open handles reported.
- After final batch/CORS review: 3 affected suites / 57 tests passed, including an added rate-limit/CORS case.
- Additional moderation verification: 7 tests passed, including a new independent-connection case. There are 313 distinct backend tests after these two added cases.
- Web client: 13 tests passed. Browser: all 4 login/session/HTTPS scenarios passed.
- Workspace lint and typechecks passed; final backend lint and backend/web production builds passed.
- Load validation: 200 competing quota reservations over 8 SQLite writers admitted exactly the configured quota; 100 authenticated session reads passed.
- Backend runtime dependency audit: zero findings. Existing mobile/development dependency findings remain documented separately.

Live OAuth and AI provider credentials were not exercised. Local dataset records include imported and generated seeds as well as curated records; inspect source attribution rather than assuming every database record has veterinary approval.

Community Wisdom research was attempted through the installed DevRelay gateway, which returned an account-connection error. HTTP behavior was verified against [HTTP Semantics](https://httpwg.org/specs/rfc9110.html) and [Express 5 documentation](https://expressjs.com/en/5x/api/); no community citations are invented.
