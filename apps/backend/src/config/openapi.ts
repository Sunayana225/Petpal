import { API_VERSION } from './version';
import { DATASET_FIELDS } from '../routes/foodSafety/datasetQuery';

const errorResponse = { description: 'Request failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
const success = (description = 'Successful response') => ({ description, content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } });
const parameter = (name: string, location = 'query', required = false) => ({ name, in: location, required, schema: { type: 'string' } });
const paging = [parameter('limit'), parameter('offset')];
const session = [{ cookieSession: [] }];
const bearer = [{ bearerKey: [] }];
const admin = [{ cookieSession: [] }, { adminToken: [] }];
const csrf = parameter('X-CSRF-Token', 'header', true);
const operation = (summary: string, security: object[] = [], parameters: object[] = [], requestSchema?: object, status = '200') => ({
  summary, security, parameters,
  ...(requestSchema ? { requestBody: { required: true, content: { 'application/json': { schema: requestSchema } } } } : {}),
  responses: { [status]: success(), '400': errorResponse, '401': errorResponse, '403': errorResponse, '404': errorResponse, '409': errorResponse, '429': errorResponse, '503': errorResponse, '405': errorResponse, '406': errorResponse, '414': errorResponse, '415': errorResponse },
});
const keySchema = { type: 'object', additionalProperties: false, properties: {
  name: { type: 'string', minLength: 1, maxLength: 60 }, enabled: { type: 'boolean' },
  quotaLimit: { type: ['integer', 'null'], minimum: 0, maximum: 1000000000 },
  quotaWindow: { enum: ['day', 'month', 'total'] }, scope: { enum: ['food-safety', 'check', 'dataset'] },
  ipAllowlist: { type: 'array', maxItems: 20, items: { type: 'string' } }, expiresAt: { type: ['string', 'null'], format: 'date-time' },
} };
const checkSchema = { type: 'object', additionalProperties: false, required: ['pet', 'food'], properties: { pet: { type: 'string', minLength: 1, maxLength: 50 }, food: { type: 'string', minLength: 1, maxLength: 100 }, mode: { enum: ['auto', 'local'], default: 'auto' } } };
const paths: Record<string, object> = {
  '/health': { get: operation('Process liveness') }, '/ready': { get: operation('Database readiness') }, '/info': { get: operation('API information') },
  '/auth/providers': { get: operation('Configured login providers') }, '/auth/me': { get: operation('Current user and CSRF token') },
  '/auth/logout': { post: operation('Destroy current session', session, [csrf]) },
  '/auth/dev-login': { post: operation('Local-only sign-in; unavailable in production', [], [], { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' } } }) },
  '/auth/{provider}': { get: { ...operation('Start OAuth or link an identity', [], [parameter('provider', 'path', true), parameter('next'), parameter('link')]), responses: { '302': { description: 'Provider redirect' }, '403': errorResponse, '503': errorResponse } } },
  '/auth/{provider}/callback': { get: { ...operation('Consume one-use OAuth transaction', [], [parameter('provider', 'path', true), parameter('code'), parameter('state')]), responses: { '302': { description: 'Redirect to web app' }, '503': errorResponse } } },
  '/auth/account/identities': { get: operation('List linked identities', session) },
  '/auth/account/identities/{provider}': { delete: operation('Unlink; requires recent authentication and another method', session, [parameter('provider', 'path', true), csrf]) },
  '/sessions': { get: operation('List active sessions with opaque identifiers', session), delete: operation('Sign out all devices', session, [csrf]) },
  '/sessions/{id}': { delete: operation('Revoke owned session', session, [parameter('id', 'path', true), csrf]) },
  '/me/keys': { get: operation('Paginated active keys', session, paging), post: operation('Create key; raw key is returned once', session, [csrf], { ...keySchema, required: ['name'] }, '201') },
  '/me/keys/{id}': { patch: operation('Update owned key', session, [parameter('id', 'path', true), csrf], keySchema), delete: operation('Permanently revoke owned key', session, [parameter('id', 'path', true), csrf]) },
  '/me/keys/{id}/rotate': { post: operation('Rotate with 0–86400 seconds of overlap (default 300)', session, [parameter('id', 'path', true), csrf], { type: 'object', properties: { graceSeconds: { type: 'integer', minimum: 0, maximum: 86400 } } }, '201') },
  '/me/keys/{id}/usage': { get: operation('Owned key usage; since must be within the past 366 days', session, [parameter('id', 'path', true), parameter('since'), ...paging]) },
  '/me/usage': { get: operation('Account usage; since must be within the past 366 days', session, [parameter('since'), ...paging]) },
  '/me/audit': { get: operation('Paginated key lifecycle audit', session, paging) },
  '/monitoring/metrics': { get: operation('Admin-only request metrics', admin) }, '/monitoring/status': { get: operation('Admin-only process status', admin) },
  '/monitoring/reset': { post: operation('Admin-only development metrics reset', admin, [csrf]) },
  '/admin/queue': { get: operation('Review queue', admin, [parameter('status')]) },
  '/admin/queue/{id}/approve': { post: operation('Approve answer', admin, [parameter('id', 'path', true), csrf]) },
  '/admin/queue/{id}/reject': { post: operation('Reject answer', admin, [parameter('id', 'path', true), csrf]) },
  '/admin/users/{id}': { patch: operation('Disable account and revoke sessions', admin, [parameter('id', 'path', true), csrf], { type: 'object', required: ['disabled'], properties: { disabled: { type: 'boolean' } } }) },
  '/gemini/validate': { post: operation('Validate a caller-supplied Gemini key', [], [], { type: 'object', required: ['apiKey'], properties: { apiKey: { type: 'string', minLength: 10, maxLength: 200 } } }) },
  '/check': { get: operation('Legacy check alias', [], [parameter('animal'), parameter('food', 'query', true)]) },
};
const datasetParameters = [
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 100 } },
  { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 100000, default: 0 } },
  { ...parameter('cursor'), description: 'Opaque nextCursor bound to filters and dataset revision; incompatible with offset. Stale revisions return 409.' },
  parameter('pet'), { name: 'safety', in: 'query', schema: { enum: ['safe', 'caution', 'unsafe'] } },
  { name: 'severity', in: 'query', schema: { enum: ['low', 'medium', 'high'] } }, parameter('source'), parameter('q'),
  { name: 'match', in: 'query', schema: { enum: ['contains', 'prefix', 'exact'], default: 'contains' } },
  { name: 'sort', in: 'query', schema: { enum: ['food', 'pet', 'safety', 'severity', 'source'], default: 'food' } },
  { name: 'order', in: 'query', schema: { enum: ['asc', 'desc'], default: 'asc' } },
  { ...parameter('fields'), description: 'Up to 10 comma-separated unique field names; food, pet and safety always retained.' },
  { name: 'has', in: 'query', schema: { enum: ['symptoms', 'benefits', 'alternatives', 'preparation', 'recommendation', 'ingredients'] } },
  parameter('If-None-Match', 'header'), parameter('If-Match', 'header'),
];
const checkResult = { type: 'object', required: ['pet', 'food', 'safety', 'message'], properties: {
  pet: { type: 'string' }, food: { type: 'string' }, safety: { enum: ['safe', 'caution', 'unsafe', 'unknown'] }, message: { type: 'string' }, source: { enum: ['database', 'external', 'ai', 'none'] }, details: { type: 'object' },
} };
const batchInput = { type: 'object', additionalProperties: false, required: ['items'], properties: { items: { type: 'array', minItems: 1, maxItems: 20, items: { ...checkSchema, properties: { ...checkSchema.properties, mode: { const: 'local' } } } } } };
const compareInput = { type: 'object', additionalProperties: false, required: ['food', 'pets'], properties: { food: checkSchema.properties.food, pets: { type: 'array', minItems: 1, maxItems: 10, uniqueItems: true, items: checkSchema.properties.pet } } };
const batchResult = { type: 'object', required: ['results', 'count', 'uniqueChecks', 'mode', 'revision'], properties: { results: { type: 'array', items: { ...checkResult, properties: { ...checkResult.properties, inputIndex: { type: 'integer', minimum: 0 } } } }, count: { type: 'integer' }, uniqueChecks: { type: 'integer' }, mode: { const: 'local' }, revision: { type: 'string' } } };
const compareResult = { type: 'object', required: ['food', 'results', 'count', 'bySafety', 'consistent'], properties: { food: { type: 'string' }, results: { type: 'array', items: checkResult }, count: { type: 'integer' }, bySafety: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } }, consistent: { type: 'boolean' } } };
paths['/admin/cache'] = { get: operation('Admin-only memory-cache diagnostics and durable review counts', admin), delete: operation('Clear memory caches; preserve durable review records', admin, [csrf]) };
for (const prefix of ['/food-safety', '/v1/food-safety']) {
  const security = prefix.startsWith('/v1') ? bearer : [];
  paths[`${prefix}/check`] = { get: operation('Food-safety verdict', security, [parameter('pet', 'query', true), parameter('food', 'query', true)]), post: operation('Food-safety verdict', security, [], checkSchema) };
  for (const route of ['pets', 'species', 'stats', 'summary', 'sources', 'metadata', 'foods', 'search', 'autocomplete', 'safe/{pet}', 'caution/{pet}', 'unsafe/{pet}']) {
    const paged = ['foods', 'search', 'autocomplete'].includes(route) || route.includes('{pet}');
    const params = paged ? datasetParameters.map(value => value.name === 'q' && ['search', 'autocomplete'].includes(route) ? { ...value, required: true } : value) : route === 'summary' ? datasetParameters.filter(value => ['pet', 'safety', 'severity', 'source', 'q', 'match', 'has', 'If-None-Match', 'If-Match'].includes(value.name)) : [parameter('If-None-Match', 'header'), parameter('If-Match', 'header')];
    paths[`${prefix}/${route}`] = { get: { ...operation(`Dataset ${route}`, bearer, route.includes('{pet}') ? [parameter('pet', 'path', true), ...params.filter(value => value.name !== 'pet')] : params), responses: {
      ...operation('Dataset').responses, '304': { description: 'Representation unchanged; no response body' }, '412': errorResponse,
      '200': { ...success(), headers: { ETag: { schema: { type: 'string' } }, 'X-Dataset-Revision': { schema: { type: 'string' } }, Link: { schema: { type: 'string' }, description: 'Relative next-page link when more results exist' } } },
    } } };
  }
  paths[`${prefix}/lookup`] = { get: operation('Curated-only lookup; never calls upstream services', bearer, [parameter('pet', 'query', true), parameter('food', 'query', true), { name: 'mode', in: 'query', schema: { const: 'local' } }]) };
  paths[`${prefix}/batch-check`] = { post: { ...operation('Curated-only ordered batch; one keyed request admission, no paid amplification', bearer, [], batchInput), responses: { ...operation('Batch').responses, '200': { description: 'Ordered local verdicts', content: { 'application/json': { schema: batchResult } } } } } };
  paths[`${prefix}/compare`] = { post: { ...operation('Compare curated verdicts across distinct species aliases', bearer, [], compareInput), responses: { ...operation('Compare').responses, '200': { description: 'Species verdict comparison', content: { 'application/json': { schema: compareResult } } } } } };
}
export const openapi = {
  openapi: '3.1.0', info: { title: 'PetPal API', version: API_VERSION, description: 'Cookie console mutations require X-CSRF-Token from /auth/me and recent sign-in for sensitive changes. Bearer API clients do not require CSRF. Quotas count admitted requests, including failures and disconnects.' },
  servers: [{ url: '/api' }], paths,
  components: {
    securitySchemes: { cookieSession: { type: 'apiKey', in: 'cookie', name: 'petpal.sid' }, bearerKey: { type: 'http', scheme: 'bearer' }, adminToken: { type: 'apiKey', in: 'header', name: 'x-admin-token' } },
    schemas: { Error: { type: 'object', required: ['code', 'errorCode', 'requestId'], properties: { code: { type: 'integer' }, errorCode: { type: 'string' }, requestId: { type: 'string' }, message: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' } } }, KeyInput: keySchema, FoodCheck: checkSchema, FoodCheckResult: checkResult, BatchInput: batchInput, BatchResult: batchResult, CompareInput: compareInput, CompareResult: compareResult, DatasetFields: { type: 'string', enum: DATASET_FIELDS }, Pagination: { type: 'object', required: ['total', 'limit', 'offset', 'hasNext', 'nextCursor'], properties: { total: { type: 'integer' }, limit: { type: 'integer', minimum: 1, maximum: 100 }, offset: { type: 'integer' }, hasNext: { type: 'boolean' }, nextCursor: { type: ['string', 'null'] } } } },
  },
};
