import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import { env } from '../config/env';
import { userRepository, type OAuthProfile, type User } from '../repositories/userRepository';
import { logger } from '../utils/logger';
import type { Request } from 'express';
import { OAuthStateStore } from './security';

export type OAuthProvider = 'github' | 'google';

interface NormalisableProfile {
  id: string;
  displayName?: string;
  username?: string;
  emails?: { value: string; verified?: boolean; primary?: boolean }[];
  _json?: { email_verified?: boolean; verified_email?: boolean };
  photos?: { value: string }[];
}

function normalize(provider: OAuthProvider, profile: NormalisableProfile): OAuthProfile {
  const email = profile.emails?.find((value) => value.primary && value.verified) ?? profile.emails?.find((value) => value.verified) ?? profile.emails?.[0];
  return {
    provider,
    providerUserId: profile.id,
    email: email?.value ?? null,
    name: profile.displayName ?? profile.username ?? null,
    avatarUrl: profile.photos?.[0]?.value ?? null,
    emailVerified: email?.verified === true || profile._json?.email_verified === true || profile._json?.verified_email === true,
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
  passport.deserializeUser((id, done) => {
    try {
      const user = userRepository().findById(String(id));
      done(null, user && !user.disabled ? user : false);
    } catch (error) { done(error); }
  });

  const base = callbackBase();
  const verify =
    (provider: OAuthProvider) =>
    (req: Request, _accessToken: string, _refreshToken: string, profile: NormalisableProfile, done: (err: unknown, user?: User) => void) => {
      try {
        const normalized = normalize(provider, profile);
        const linkId = req.session.oauthLinkUserId;
        if (linkId && (!(req.user as User | undefined)?.id || (req.user as User).id !== linkId ||
            !req.session.authenticatedAt || Date.now() - req.session.authenticatedAt > env.reauthMs)) {
          return done(new Error('Account linking requires recent authentication'));
        }
        const user = linkId ? userRepository().link(linkId, normalized) : userRepository().upsertFromOAuth(normalized);
        if (user.disabled) return done(new Error('Account disabled'));
        done(null, user);
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
          store: new OAuthStateStore('github'),
          passReqToCallback: true,
          scope: ['user:email'],
          allRawEmails: true,
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
          store: new OAuthStateStore('google'),
          passReqToCallback: true,
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
