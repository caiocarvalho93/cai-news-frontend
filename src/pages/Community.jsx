import { useEffect, useState } from "react";
import TranslatedText from "../components/TranslatedText";
import API_BASE from "../config/api";

export default function Community() {
  const [authUser, setAuthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('authUser') || 'null'); } catch { return null; }
  });
  const [authToken, setAuthToken] = useState(() => {
    try { return localStorage.getItem('authToken') || ''; } catch { return ''; }
  });
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        if (authToken) {
          const r = await fetch(`${API_BASE}/api/community/profile`, {
            headers: { Authorization: `Bearer ${authToken}` }
          }).then(r => r.json()).catch(() => null);
          if (r?.success) setIsMember(!!r.isMember);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [authToken]);

  const join = async () => {
    try {
      if (!authToken) return;
      const r = await fetch(`${API_BASE}/api/community/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      }).then(r => r.json());
      if (r?.success) setIsMember(true);
    } catch {}
  };

  return (
    <div className="container io-container">
      <div className="io-hero io-scan-wall io-bg-grid" style={{ marginBottom: 16 }}>
        <div className="io-title">🥷 <TranslatedText>cAI Community</TranslatedText></div>
        <div className="io-subtitle">
          <TranslatedText>Innovators advancing the AI TechHub</TranslatedText>
        </div>
      </div>

      <div className="io-card" style={{ padding: 16 }}>
        {loading ? (
          <div className="io-skeleton" style={{ height: 60 }}></div>
        ) : authUser ? (
          <>
            <div style={{ marginBottom: 10 }}>
              <TranslatedText>Welcome</TranslatedText>, {authUser.name || authUser.email || 'member'}!
            </div>
            <div style={{ marginBottom: 16 }}>
              {isMember ? (
                <span className="badge">🥷 <TranslatedText>Member</TranslatedText></span>
              ) : (
                <button className="btn btn-primary" onClick={join}>
                  <TranslatedText>Join cAI Community</TranslatedText>
                </button>
              )}
            </div>
            <div className="text-secondary">
              <TranslatedText>
                Community features coming soon: submit articles, vote on curation, earn badges, and shape the global AI feed.
              </TranslatedText>
            </div>
          </>
        ) : (
          <div className="text-muted">
            <TranslatedText>Please sign in from the top bar to join the community.</TranslatedText>
          </div>
        )}
      </div>
    </div>
  );
}

