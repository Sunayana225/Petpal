import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../lib/auth';
import { EASE } from '../motion/tokens';

const LINKS = [
  { to: '/', label: 'Checker' },
  { to: '/docs', label: 'API' },
];

const CONSOLE_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tokens', label: 'Tokens' },
  { to: '/usage', label: 'Usage' },
  { to: '/security', label: 'Security' },
];

/**
 * A quiet, sticky masthead. It floats over the parchment hero and only draws a
 * hairline once you scroll, so the top of the page stays uninterrupted.
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const logout = async () => {
    if (signingOut) return;
    setSigningOut(true); setLogoutError(null);
    try { await signOut(); }
    catch (error) { setLogoutError(error instanceof Error ? error.message : 'Sign out failed. Try again.'); }
    finally { setSigningOut(false); }
  };

  useMotionValueEvent(scrollY, 'change', (value) => setScrolled(value > 16));

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color] duration-700 ${
        scrolled || open
          ? 'border-b border-slate bg-parchment/90 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-5 sm:px-10">
        <NavLink to="/" className="flex items-baseline gap-3" aria-label="PetPal home">
          <span className="font-display text-[22px] leading-none tracking-tight text-ink">
            PetPal
          </span>
          <span className="hidden text-[10px] uppercase tracking-luxe text-mist sm:inline">
            Veterinary food safety
          </span>
        </NavLink>

        <nav className="hidden items-center gap-10 sm:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className="group relative py-1 text-[12px] uppercase tracking-wide-cap"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={
                      isActive
                        ? 'text-ink'
                        : 'text-stone transition-colors duration-500 group-hover:text-ink'
                    }
                  >
                    {link.label}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-0 -bottom-0.5 h-px bg-ink"
                      transition={{ duration: 0.5, ease: EASE }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {user ? (
            <span className="flex items-center gap-6 border-l border-slate pl-10">
              <Link
                to="/dashboard"
                className="link-line text-[12px] uppercase tracking-wide-cap text-charcoal"
              >
                Console
              </Link>
              <Link to="/security" className="text-[12px] uppercase text-charcoal">Security</Link>
              <button
                type="button"
                onClick={() => void logout()}
                disabled={signingOut}
                className="text-[12px] uppercase tracking-wide-cap text-mist transition-colors duration-500 hover:text-ink"
              >
                Sign out
              </button>
            </span>
          ) : (
            <Link
              to="/login"
              className="border-l border-slate pl-10 text-[12px] uppercase tracking-wide-cap text-charcoal transition-colors duration-500 hover:text-ink"
            >
              Sign in
            </Link>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="relative flex h-8 w-8 flex-col items-center justify-center gap-[5px] sm:hidden"
        >
          <motion.span
            animate={open ? { rotate: 45, y: 3 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="block h-px w-6 bg-ink"
          />
          <motion.span
            animate={open ? { rotate: -45, y: -3 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="block h-px w-6 bg-ink"
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="overflow-hidden border-t border-slate bg-parchment sm:hidden"
          >
            <ul className="flex flex-col px-5 py-4">
              {[...LINKS, ...(user ? CONSOLE_LINKS : [{ to: '/login', label: 'Sign in' }])].map(
                (link, index) => (
                  <motion.li
                    key={link.to}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.06 * index }}
                    className="border-b border-slate last:border-b-0"
                  >
                    <NavLink
                      to={link.to}
                      end={link.to === '/'}
                      className="block py-4 font-display text-2xl tracking-tight text-ink"
                    >
                      {link.label}
                    </NavLink>
                  </motion.li>
                ),
              )}
              {user && (
                <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4">
                  <button
                    type="button"
                    onClick={() => void logout()}
                    disabled={signingOut}
                    className="text-[12px] uppercase tracking-wide-cap text-mist"
                  >
                    Sign out
                  </button>
                </motion.li>
              )}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
      {logoutError && <p role="alert" className="px-5 pb-3 text-sm text-unsafe">{logoutError}</p>}
    </header>
  );
}
