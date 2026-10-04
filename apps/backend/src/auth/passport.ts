import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import { env } from '../config/env';
import { userRepository, type OAuthProfile, type User } from '../repositories/userRepository';
import { logger } from '../utils/logger';

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
  return env.oauthCallbackBase;
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  if (provider === 'github') return Boolean(env.githubClientId && env.githubClientSecret);
  return Boolean(env.googleClientId && env.googleClientSecret);
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
          clientID: env.githubClientId as string,
          clientSecret: env.githubClientSecret as string,
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
          clientID: env.googleClientId as string,
          clientSecret: env.googleClientSecret as string,
          callbackURL: `${base}/api/auth/google/callback`,
        },
        verify('google'),
      ),
    );
  } else {
    warnUnconfigured('Google', 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET');
  }
}

/** OAuth is optional; a missing config is a warning, not an error. */
function warnUnconfigured(provider: string, variables: string): void {
  logger.warn('OAuth provider not configured', { provider, variables });
}

export { passport };
