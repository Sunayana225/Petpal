import { requestJson } from './api';
import type { ApiKey, AuthUser, CreatedApiKey, QuotaWindow, UsageResponse } from '../types';

/** The session-authenticated endpoints behind the developer console. */
export const consoleApi = {
  me(): Promise<{ user: AuthUser | null }> {
    return requestJson<{ user: AuthUser | null }>('/auth/me');
  },

  logout(): Promise<{ ok: true }> {
    return requestJson<{ ok: true }>('/auth/logout', { method: 'POST' });
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
};
