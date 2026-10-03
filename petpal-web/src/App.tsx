import { AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import Footer from './components/Footer';
import Header from './components/Header';
import { setCanonical, trackPageview } from './lib/analytics';
import PageTransition from './motion/PageTransition';
import BrowsePage from './pages/BrowsePage';
import DocsPage from './pages/DocsPage';
import HomePage from './pages/HomePage';

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
    <div className="flex min-h-screen flex-col bg-parchment">
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/docs" element={<DocsPage />} />
              {/* Unknown paths fall back to the checker rather than a blank page. */}
              <Route path="*" element={<HomePage />} />
            </Routes>
          </PageTransition>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
