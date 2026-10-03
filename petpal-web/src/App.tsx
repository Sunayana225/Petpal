import { Route, Routes } from 'react-router-dom';

import Footer from './components/Footer';
import Header from './components/Header';
import BrowsePage from './pages/BrowsePage';
import DocsPage from './pages/DocsPage';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/docs" element={<DocsPage />} />
          {/* Unknown paths fall back to the checker rather than a blank page. */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
