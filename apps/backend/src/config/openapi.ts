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
  responses: { [status]: success(), '400': errorResponse, '401': errorResponse, '403': errorResponse, '404': errorResponse, '409': errorResponse, '429': errorResponse, '503': errorResponse },
});
const keySchema = { type: 'object', additionalProperties: false, properties: {
  name: { type: 'string', minLength: 1, maxLength: 60 }, enabled: { type: 'boolean' },
  quotaLimit: { type: ['integer', 'null'], minimum: 0, maximum: 1000000000 },
  quotaWindow: { enum: ['day', 'month', 'total'] }, scope: { enum: ['food-safety', 'check', 'dataset'] },
  ipAllowlist: { type: 'array', maxItems: 20, items: { type: 'string' } }, expiresAt: { type: ['string', 'null'], format: 'date-time' },
} };
const checkSchema = { type: 'object', required: ['pet', 'food'], properties: { pet: { type: 'string', maxLength: 50 }, food: { type: 'string', maxLength: 100 } } };
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
for (const prefix of ['/food-safety', '/v1/food-safety']) {
  const security = prefix.startsWith('/v1') ? bearer : [];
  paths[`${prefix}/check`] = { get: operation('Food-safety verdict', security, [parameter('pet', 'query', true), parameter('food', 'query', true)]), post: operation('Food-safety verdict', security, [], checkSchema) };
  for (const route of ['pets', 'stats', 'search', 'safe/{pet}', 'caution/{pet}', 'unsafe/{pet}']) {
    paths[`${prefix}/${route}`] = { get: operation(`Dataset ${route}`, bearer, route.includes('{pet}') ? [parameter('pet', 'path', true)] : route === 'search' ? [parameter('q', 'query', true), parameter('pet')] : []) };
  }
}
export const openapi = {
  openapi: '3.1.0', info: { title: 'PetPal API', version: '1.0.0', description: 'Cookie console mutations require X-CSRF-Token from /auth/me and recent sign-in for sensitive changes. Bearer API clients do not require CSRF. Quotas count admitted requests, including failures and disconnects.' },
  servers: [{ url: '/api' }], paths,
  components: {
    securitySchemes: { cookieSession: { type: 'apiKey', in: 'cookie', name: 'petpal.sid' }, bearerKey: { type: 'http', scheme: 'bearer' }, adminToken: { type: 'apiKey', in: 'header', name: 'x-admin-token' } },
    schemas: { Error: { type: 'object', required: ['code', 'errorCode', 'requestId'], properties: { code: { type: 'integer' }, errorCode: { type: 'string' }, requestId: { type: 'string' }, message: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' } } }, KeyInput: keySchema, FoodCheck: checkSchema },
  },
};
