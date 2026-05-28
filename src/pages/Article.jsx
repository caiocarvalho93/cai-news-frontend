import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import TranslatedText from "../components/TranslatedText";
import API_BASE from "../config/api";

export default function ArticlePage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { language, translateText } = useLanguage ? useLanguage() : { language: 'en', translateText: async (t) => t };
  const [article, setArticle] = useState(null);
  const [contentHtml, setContentHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [overlay, setOverlay] = useState({ show: false, status: 'idle', translatedTitle: '', translatedSnippet: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const qp = new URLSearchParams(location.search);
        const fallbackUrl = qp.get('url');
        let finalArticle = null;
        if (id && id !== 'unknown') {
          const r = await fetch(`${API_BASE}/api/articles/by-id/${id}`).then(r => r.json());
          if (r?.success && r.article) {
            finalArticle = r.article;
            setArticle(r.article);
          }
        }
        const urlToUse = finalArticle?.url || fallbackUrl;
        if (!urlToUse) throw new Error('Article not found');
        const prox = await fetch(`${API_BASE}/api/article/proxy?url=${encodeURIComponent(urlToUse)}`).then(r => r.json());
        if (!prox?.success) throw new Error('Failed to load content');
        setContentHtml(prox.content_html || "");
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id, location.search]);

  const handleTranslate = async () => {
    try {
      setOverlay({ show: true, status: 'loading', translatedTitle: '', translatedSnippet: '' });
      const title = article?.title || '';
      const snippet = (article?.description || '').slice(0, 800);
      const tTitle = await translateText(title, language);
      const tSnippet = await translateText(snippet, language);
      setOverlay({ show: true, status: 'ready', translatedTitle: tTitle, translatedSnippet: tSnippet });
    } catch {
      setOverlay({ show: true, status: 'error', translatedTitle: '', translatedSnippet: '' });
    }
  };

  if (loading) {
    return (
      <div className="container io-container">
        <div className="io-hero io-scan-wall">
          <div className="io-title">🌍 AI Translation Loading...</div>
          <div className="io-subtitle">Preparing {language?.toUpperCase()} translation overlay...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container io-container">
        <div className="text-muted">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container io-container">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <button className="btn" onClick={() => navigate(-1)}>← <TranslatedText>Back</TranslatedText></button>
        <div className="flex" style={{ gap: 8 }}>
          <button className="btn" onClick={handleTranslate}>🌍 <TranslatedText>Translate</TranslatedText></button>
          {article?.url && (
            <a className="btn" href={article.url} target="_blank" rel="noopener noreferrer">🔗 <TranslatedText>Original</TranslatedText></a>
          )}
        </div>
      </div>
      <div className="io-card" style={{ padding: 16 }}>
        <div className="subheading" style={{ marginBottom: 6 }}>
          <TranslatedText>{article?.title || ''}</TranslatedText>
        </div>
        <div className="text-muted" style={{ marginBottom: 12 }}>
          {article?.source} {article?.author && `• ${article.author}`} • {article?.country}
        </div>
        <div
          className="io-article-body"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>

      {overlay.show && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999
          }}
          onClick={() => setOverlay({ show: false, status: 'idle', translatedTitle: '', translatedSnippet: '' })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="io-card"
            style={{ width: 720, maxWidth: "92vw", padding: 18, background: "rgba(0, 0, 0, 0.9)" }}
          >
            <div className="io-title">🌍 <TranslatedText>AI Translation Loading...</TranslatedText></div>
            <div className="text-muted" style={{ marginBottom: 10 }}>
              <TranslatedText>Preparing {language?.toUpperCase()} translation overlay...</TranslatedText>
            </div>
            <div className="text-muted" style={{ marginBottom: 14 }}>
              <TranslatedText>Article:</TranslatedText> {article?.title?.slice(0, 80)}...
            </div>
            <div className="text-muted" style={{ marginBottom: 14 }}>
              💎 <TranslatedText>Powered by AI Intelligence Network</TranslatedText>
            </div>
            <div className="text-muted" style={{ marginBottom: 14 }}>
              🚀 <TranslatedText>Million Dollar Translation Technology</TranslatedText>
            </div>
            {overlay.status === 'loading' && (
              <div className="io-skeleton" style={{ height: 120 }}></div>
            )}
            {overlay.status === 'ready' && (
              <div>
                <div className="subheading" style={{ marginBottom: 6 }}>{overlay.translatedTitle}</div>
                <div className="text-secondary" style={{ whiteSpace: "pre-line" }}>{overlay.translatedSnippet}</div>
              </div>
            )}
            {overlay.status === 'error' && (
              <div className="text-muted"><TranslatedText>Translation failed. Please try again.</TranslatedText></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

