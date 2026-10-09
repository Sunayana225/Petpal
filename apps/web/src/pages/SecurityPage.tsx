import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../api/client';
import { consoleApi } from '../api';
import { useAuth } from '../lib/auth';

export default function SecurityPage() {
  const { refresh } = useAuth();
  const [sessions, setSessions] = useState<{ id: string; current: boolean; lastActiveAt: number; expiresAt: number }[]>([]);
  const [identities, setIdentities] = useState<{ provider: string; providerUserId: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [sessionResult, identityResult] = await Promise.all([consoleApi.sessions(), consoleApi.identities()]);
    setSessions(sessionResult.sessions); setIdentities(identityResult.identities);
  }, []);
  useEffect(() => { void load().catch((failure: Error) => setError(failure.message)); }, [load]);
  const change = async (work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await work(); await refresh(); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update account security.'); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-3xl px-5 py-20">
    <h1 className="font-display text-4xl">Account security</h1>
    {error && <p role="alert" className="mt-6 text-unsafe">{error} <a href="/login">Sign in again</a></p>}
    <h2 className="mt-10 text-2xl">Sign-in methods</h2>
    <ul>{identities.map((identity) => <li className="mt-4" key={identity.provider + identity.providerUserId}>
      {identity.provider} <button disabled={busy || identities.length <= 1} onClick={() => void change(() => consoleApi.unlink(identity.provider))}>Unlink</button>
    </li>)}</ul>
    <p className="mt-4">Keep at least one sign-in method linked.</p>
    <div className="mt-4 flex gap-6">{['github', 'google'].map((provider) => <a key={provider} href={`${API_BASE_URL}/auth/${provider}?link=1&next=/security`}>Link {provider}</a>)}</div>
    <h2 className="mt-10 text-2xl">Active sessions</h2>
    <ul>{sessions.map((session) => <li key={session.id} className="mt-4 border-b border-slate py-4">
      {session.current ? 'This browser' : 'Another session'} · Active {new Date(session.lastActiveAt).toLocaleString()}
      <button className="ml-4" disabled={busy} onClick={() => void change(() => consoleApi.revokeSession(session.id))}>Revoke</button>
    </li>)}</ul>
    <button className="mt-8" disabled={busy} onClick={() => void change(() => consoleApi.logoutAll())}>Sign out all devices</button>
  </div>;
}
