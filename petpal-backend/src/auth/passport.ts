import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import { userRepository, type OAuthProfile, type User } from '../repositories/userRepository';

export type OAuthProvider = 'github' | 'google';

interface NormalisableProfile {
  id: string;
  displayName?: string;
  username?: string;
  emails?: { value: string }[];
  photos?: { value: string }[];
}

function normalize(provider: OAuthProvider, profile: NormalisableProfile): OAuthProfile {
  return {
    provider,
    providerUserId: profile.id,
    email: profile.emails?.[0]?.value ?? null,
    name: profile.displayName ?? profile.username ?? null,
    avatarUrl: profile.photos?.[0]?.value ?? null,
  };
}

function callbackBase(): string {
  return process.env.OAUTH_CALLBACK_BASE ?? `http://localhost:${process.env.PORT ?? 3001}`;
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  if (provider === 'github') return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

let configured = false;

/** Register serialisation and whichever OAuth strategies have credentials. */
export function configurePassport(): void {
  if (configured) return;
  configured = true;

  passport.serializeUser((user, done) => done(null, (user as User).id));
  passport.deserializeUser((id, done) => done(null, userRepository().findById(String(id))));

  const base = callbackBase();
  const verify =
    (provider: OAuthProvider) =>
    (_accessToken: string, _refreshToken: string, profile: NormalisableProfile, done: (err: unknown, user?: User) => void) => {
      try {
        done(null, userRepository().upsertFromOAuth(normalize(provider, profile)));
      } catch (error) {
        done(error);
      }
    };

  if (isProviderConfigured('github')) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID as string,
          clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
          callbackURL: `${base}/api/auth/github/callback`,
        },
        verify('github'),
      ),
    );
  } else {
    warnUnconfigured('GitHub', 'GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET');
  }

  if (isProviderConfigured('google')) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          callbackURL: `${base}/api/auth/google/callback`,
        },
        verify('google'),
      ),
    );
  } else {
    warnUnconfigured('Google', 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET');
  }
}

/** Config warnings are noise in the test suite. */
function warnUnconfigured(provider: string, variables: string): void {
  if (process.env.NODE_ENV !== 'test') {
    console.warn(`[auth] ${provider} OAuth not configured (set ${variables})`);
  }
}

export { passport };
