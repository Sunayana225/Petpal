import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../lib/auth';
import { Reveal } from '../motion/primitives';
import { API_BASE_URL, ApiError } from '../services/api';
import { consoleApi } from '../services/consoleApi';

/**
 * Sign-in for the developer console. GitHub/Google buttons hand off to the API's
 * OAuth endpoints; the session cookie comes back to the app on the callback.
 */
export default function LoginPage() {
  const { user, loading, refresh } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  if (!loading && user) return <Navigate to={from} replace />;

  const start = (provider: 'github' | 'google') => {
    window.location.href = `${API_BASE_URL}/auth/${provider}`;
  };

  const devSignIn = async () => {
    try {
      await consoleApi.devLogin('Dev User');
      await refresh();
      navigate(from, { replace: true });
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : 'Dev sign-in failed.');
    }
  };

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

      <Reveal delay={0.15} className="mt-12">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => start('github')}
            className="border border-charcoal px-6 py-3.5 text-[12px] uppercase tracking-wide-cap text-ink transition-colors duration-500 hover:bg-charcoal hover:text-parchment"
          >
            Continue with GitHub
          </button>
          <button
            type="button"
            onClick={() => start('google')}
            className="border border-slate px-6 py-3.5 text-[12px] uppercase tracking-wide-cap text-charcoal transition-colors duration-500 hover:border-charcoal"
          >
            Continue with Google
          </button>

          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={devSignIn}
              className="border border-dashed border-slate px-6 py-3.5 text-[12px] uppercase tracking-wide-cap text-mist transition-colors duration-500 hover:border-forest hover:text-forest"
            >
              Continue as dev user (local only)
            </button>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.2} className="mt-10">
        <p className="text-xs text-mist">
          OAuth must be configured on the API (GitHub/Google client credentials). Until then
          these buttons will report that sign-in is unavailable.
        </p>
      </Reveal>
    </div>
  );
}
