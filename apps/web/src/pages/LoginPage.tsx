import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { API_BASE_URL, ApiError, consoleApi } from '../api';
import type { AuthProviders } from '../domain/types';
import { useAuth } from '../lib/auth';
import { Reveal } from '../motion/primitives';

type ProviderKey = 'github' | 'google';

const PROVIDERS: { key: ProviderKey; label: string }[] = [
  { key: 'github', label: 'Continue with GitHub' },
  { key: 'google', label: 'Continue with Google' },
];

/** Why the API bounced the visitor back from an OAuth attempt. */
const OAUTH_ERRORS: Record<string, string> = {
  oauth: 'That sign-in did not complete. Try again, or use another provider.',
};

/**
 * Sign-in for the developer console.
 *
 * The page asks the API which providers it can actually offer before drawing any
 * buttons, so it never shows a method that would fail, and it names the exact
 * callback URL an operator still has to register. Both OAuth buttons hand off to
 * the API and the session cookie comes back on the callback.
 */
export default function LoginPage() {
  const { user, loading, refresh } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<ProviderKey | 'dev' | null>(null);
  const [devError, setDevError] = useState<string | null>(null);

  const errorCode = new URLSearchParams(location.search).get('error');
  const oauthError = errorCode
    ? (OAUTH_ERRORS[errorCode] ?? 'Sign-in failed. Please try again.')
    : null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await consoleApi.providers();
        if (!cancelled) setProviders(result);
      } catch {
        if (!cancelled) {
          setLoadError('Could not reach the API to check available sign-in methods.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Already signed in — straight to wherever they were headed.
  if (!loading && user) return <Navigate to={from} replace />;

  const startOAuth = (provider: ProviderKey) => {
    setPending(provider);
    // The API validates this and remembers it on the session across the round trip.
    window.location.assign(`${API_BASE_URL}/auth/${provider}?next=${encodeURIComponent(from)}`);
  };

  const devSignIn = async () => {
    setPending('dev');
    setDevError(null);
    try {
      await consoleApi.devLogin('Dev User');
      // Flipping `user` re-renders, and the guard above does the redirect.
      await refresh();
    } catch (error) {
      setDevError(error instanceof ApiError ? error.message : 'Dev sign-in failed.');
      setPending(null);
    }
  };

  const anyOAuth = Boolean(
    providers && (providers.providers.github || providers.providers.google),
  );
  const busy = pending !== null;

  return (
    <div className="mx-auto flex max-w-md flex-col px-5 py-24 sm:py-32">
      <Reveal>
        <p className="eyebrow">Developer console</p>
      </Reveal>
      <Reveal delay={0.05}>
        <h1 className="mt-5 font-display text-4xl font-light leading-tight tracking-tight text-ink">
          Sign in to PetPal
        </h1>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mt-5 text-sm leading-relaxed text-stone">
          Create API keys, track usage and manage quotas for the food-safety API.
        </p>
      </Reveal>

      {(oauthError || devError) && (
        <Reveal delay={0.12}>
          <p role="alert" className="mt-8 border-l-2 border-unsafe pl-4 text-sm text-unsafe">
            {oauthError ?? devError}
          </p>
        </Reveal>
      )}

      <Reveal delay={0.15} className="mt-12">
        {providers === null ? (
          <p
            role={loadError ? 'alert' : undefined}
            className={loadError ? 'text-sm text-unsafe' : 'text-sm italic text-mist'}
          >
            {loadError ?? 'Checking sign-in options…'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {PROVIDERS.map(({ key, label }) => {
              const configured = providers.providers[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => startOAuth(key)}
                  disabled={!configured || busy}
                  className={`px-6 py-3.5 text-[12px] uppercase tracking-wide-cap transition-colors duration-500 disabled:cursor-not-allowed ${
                    configured
                      ? 'border border-charcoal text-ink hover:bg-charcoal hover:text-parchment disabled:opacity-60'
                      : 'border border-slate text-mist'
                  }`}
                >
                  {label}
                  {!configured && ' — not configured'}
                </button>
              );
            })}

            {providers.dev && (
              <button
                type="button"
                onClick={devSignIn}
                disabled={busy}
                className="border border-dashed border-slate px-6 py-3.5 text-[12px] uppercase tracking-wide-cap text-mist transition-colors duration-500 hover:border-forest hover:text-forest disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue as dev user (local only)
              </button>
            )}
          </div>
        )}
      </Reveal>

      <Reveal delay={0.2} className="mt-10">
        {providers && !anyOAuth ? (
          <div className="text-xs leading-relaxed text-mist">
            <p className="text-charcoal">No OAuth provider is configured on this API yet.</p>
            <p className="mt-2">
              Set <code className="font-mono">GITHUB_CLIENT_ID</code> /{' '}
              <code className="font-mono">GITHUB_CLIENT_SECRET</code> (or the Google pair), then
              register this callback URL with the provider:
            </p>
            <p className="mt-2 break-all font-mono text-charcoal">
              {`${providers.callbackBase}/api/auth/{github|google}/callback`}
            </p>
          </div>
        ) : (
          <p className="text-xs text-mist">
            Sign-in creates a session cookie. The API stores only a hash of any key you create.
          </p>
        )}
      </Reveal>
    </div>
  );
}
