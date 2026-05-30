import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Always-mounted app shell — kept eager so the frame paints immediately.
import MatrixRain from "./components/MatrixRain";
import CursorGlow from "./components/CursorGlow";
import { LanguageProvider } from "./contexts/LanguageContext";
import UniversalLanguageButton from "./components/UniversalLanguageButton";
import LanguageDebugger from "./components/LanguageDebugger";
import QuantumCAIChat from "./components/QuantumCAIChat";
import TopNav from "./components/TopNav";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";

import "./styles/revolutionary-ai.css";
import "./styles/neo-io.css";
import "./styles/neo-io-extended.css";
import "./styles/neo-io-components.css";

// Route targets — lazy-loaded so each becomes its own chunk and the initial
// bundle only ships the shell + the landing route the user actually requested.
const Dashboard = lazy(() => import("./components/Dashboard"));
const NewsFeed = lazy(() => import("./components/NewsFeed"));
const CryptoTreasuryDashboard = lazy(() => import("./components/CryptoTreasuryDashboard"));
const TranslationAPIPage = lazy(() => import("./pages/TranslationAPIPage"));
const CountryPage = lazy(() => import("./pages/Country"));
const Job = lazy(() => import("./pages/Job"));
const Article = lazy(() => import("./pages/Article"));
const Community = lazy(() => import("./pages/Community"));
const Arena = lazy(() => import("./pages/Arena"));

function RouteFallback() {
  return (
    <div className="route-loading" role="status" aria-live="polite"
         style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", opacity: 0.7 }}>
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <div className="app">
        <MatrixRain />
        <CursorGlow />

        <TopNav />
        <UniversalLanguageButton />
        <LanguageDebugger />
        <QuantumCAIChat />

        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/news" element={<NewsFeed />} />
              <Route path="/arena" element={<Arena />} />
              <Route path="/crypto-treasury" element={<CryptoTreasuryDashboard />} />
              <Route path="/translation-api" element={<TranslationAPIPage />} />
              <Route path="/country/:code" element={<CountryPage />} />
              <Route path="/job/:id" element={<Job />} />
              <Route path="/article/:id" element={<Article />} />
              <Route path="/community" element={<Community />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <Footer />
    </LanguageProvider>
  );
}
 
// redeploy trigger
 
// redeploy trigger
