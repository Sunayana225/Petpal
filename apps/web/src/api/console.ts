import type {
  ApiKey,
  AuthProviders,
  AuthUser,
  CreatedApiKey,
  QuotaWindow,
  UsageResponse,
} from '../domain/types';
import { requestJson, setCsrfToken } from './client';

/** The session-authenticated endpoints behind the developer console. */
export const consoleApi = {
  /** Which sign-in methods this API can offer — drives the login page. */
  providers(): Promise<AuthProviders> {
    return requestJson<AuthProviders>('/auth/providers');
  },

  async me(): Promise<{ user: AuthUser | null }> {
    const result = await requestJson<{ user: AuthUser | null; csrfToken: string | null }>('/auth/me');
    setCsrfToken(result.csrfToken);
    return result;
  },

  async logout(): Promise<{ ok: true }> {
    const result = await requestJson<{ ok: true }>('/auth/logout', { method: 'POST' });
    setCsrfToken(null);
    return result;
  },

  /**
   * Development-only sign-in shortcut (the API refuses it in production). Lets
   * the console be used locally without configuring GitHub/Google OAuth.
   */
  devLogin(name?: string): Promise<{ user: AuthUser }> {
    return requestJson<{ user: AuthUser }>('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  listKeys(): Promise<{ keys: ApiKey[] }> {
    return requestJson<{ keys: ApiKey[] }>('/me/keys');
  },

  createKey(name: string, quotaLimit?: number | null): Promise<CreatedApiKey> {
    return requestJson<CreatedApiKey>('/me/keys', {
      method: 'POST',
      body: JSON.stringify({ name, quotaLimit }),
    });
  },

  updateKey(
    id: string,
    patch: { name?: string; enabled?: boolean; quotaLimit?: number | null; quotaWindow?: QuotaWindow },
  ): Promise<{ key: ApiKey }> {
    return requestJson<{ key: ApiKey }>(`/me/keys/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  revokeKey(id: string): Promise<{ key: ApiKey }> {
    return requestJson<{ key: ApiKey }>(`/me/keys/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  usage(): Promise<UsageResponse> {
    return requestJson<UsageResponse>('/me/usage');
  },
  sessions(): Promise<{ sessions: { id: string; current: boolean; lastActiveAt: number; expiresAt: number }[] }> {
    return requestJson('/sessions');
  },
  revokeSession(id: string): Promise<{ ok: true }> { return requestJson(`/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  logoutAll(): Promise<{ ok: true }> { return requestJson('/sessions', { method: 'DELETE' }); },
  identities(): Promise<{ identities: { provider: string; providerUserId: string }[] }> { return requestJson('/auth/account/identities'); },
  unlink(provider: string): Promise<{ ok: true }> { return requestJson(`/auth/account/identities/${encodeURIComponent(provider)}`, { method: 'DELETE' }); },
  rotateKey(id: string, graceSeconds = 300): Promise<CreatedApiKey> { return requestJson(`/me/keys/${encodeURIComponent(id)}/rotate`, { method: 'POST', body: JSON.stringify({ graceSeconds }) }); },
};
