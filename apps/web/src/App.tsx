import { AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import Footer from './components/Footer';
import Header from './components/Header';
import { setCanonical, trackPageview } from './lib/analytics';
import { AuthProvider, RequireAuth } from './lib/auth';
import PageTransition from './motion/PageTransition';
import DashboardPage from './pages/DashboardPage';
import DocsPage from './pages/DocsPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import TokensPage from './pages/TokensPage';
import UsagePage from './pages/UsagePage';
import SecurityPage from './pages/SecurityPage';

export default function App() {
  const location = useLocation();
  const isFirstRender = useRef(true);

  // One pageview per route, tagged with any captured campaign attribution.
  useEffect(() => {
    setCanonical(location.pathname);
    trackPageview(isFirstRender.current);
    isFirstRender.current = false;
  }, [location.pathname]);

  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-parchment">
        <Header />
        <main className="flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              <Routes location={location}>
                <Route path="/" element={<HomePage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/security" element={<RequireAuth><SecurityPage /></RequireAuth>} />
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <DashboardPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/tokens"
                  element={
                    <RequireAuth>
                      <TokensPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/usage"
                  element={
                    <RequireAuth>
                      <UsagePage />
                    </RequireAuth>
                  }
                />
                {/* Unknown paths fall back to the checker rather than a blank page. */}
                <Route path="*" element={<HomePage />} />
              </Routes>
            </PageTransition>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
