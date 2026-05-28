import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import TranslatedText from "./TranslatedText";
import TranslatedArticleTitle from "./TranslatedArticleTitle";
import MillionDollarArticleButton from "./MillionDollarArticleButton";
import API_BASE from "../config/api";

import "./NewsFeed.css";
import IOStatCard from "./IOStatCard";

export default function NewsFeed() {
  const [articles, setArticles] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showStartupNews, setShowStartupNews] = useState(false);
  const [startupArticles, setStartupArticles] = useState([]);
  const [showFansAIArticles, setShowFansAIArticles] = useState(false);
  const [fansAIArticles, setFansAIArticles] = useState([]);
  const [showJobSearch, setShowJobSearch] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [jobLoading, setJobLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('software engineering');
  const [location, setLocation] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showImages, setShowImages] = useState(true);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [usePrioritized, setUsePrioritized] = useState(false);
  const searchInputRef = useRef(null);
  // Simple auth for community join
  const [authUser, setAuthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('authUser') || 'null'); } catch { return null; }
  });
  const [authToken, setAuthToken] = useState(() => {
    try { return localStorage.getItem('authToken') || ''; } catch { return ''; }
  });
  const [isCommunityMember, setIsCommunityMember] = useState(false);
  const isAdmin = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("admin") === "1";
    } catch {
      return false;
    }
  })();
  // Saved segments (filters presets)
  const [savedSegments, setSavedSegments] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('newsSavedSegments') || '[]');
    } catch {
      return [];
    }
  });
  const [segmentName, setSegmentName] = useState("");
  const [pinnedSources, setPinnedSources] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('newsPinnedSources') || '[]');
    } catch {
      return [];
    }
  });
  const [pinnedCountries, setPinnedCountries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('newsPinnedCountries') || '[]');
    } catch {
      return [];
    }
  });

  // Export current filtered list to CSV
  const exportNewsCSV = () => {
    try {
      const header = ["Title", "Source", "PublishedAt", "Country", "URL"];
      const filterBySearch = (a) => {
        if (!searchTerm) return true;
        const t = (a?.title || "").toLowerCase();
        const d = (a?.description || "").toLowerCase();
        const s = searchTerm.toLowerCase();
        return t.includes(s) || d.includes(s);
      };
      const filterByPills = (a) => {
        if (selectedSource && a?.source !== selectedSource) return false;
        if (selectedCountry && (a?.country || "GLOBAL") !== selectedCountry) return false;
        return true;
      };
      const rows = articles
        .filter(filterBySearch)
        .filter(filterByPills)
        .map((a) => [
          (a?.title || "").replace(/"/g, '""'),
          (a?.source || "").replace(/"/g, '""'),
          (a?.publishedAt || a?.published_at || ""),
          a?.country || "",
          a?.url || "",
        ]);
      const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `news_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("CSV export failed:", e);
    }
  };

  const clearNewsFilters = () => {
    setSelectedSource(null);
    setSelectedCountry(null);
    setFilter("all");
    setSearchTerm("");
  };

  // Google Sign-In bootstrapping
  const initGoogle = async () => {
    try {
      if (window.google) return true;
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.defer = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      return true;
    } catch {
      return false;
    }
  };
  const beginGoogleSignIn = async () => {
    try {
      const ok = await initGoogle();
      if (!ok) return;
      const conf = await fetch(`${API_BASE}/api/public-config`).then(r => r.json()).catch(() => ({}));
      if (!conf?.googleClientId) return;
      window.google.accounts.id.initialize({
        client_id: conf.googleClientId,
        callback: async (resp) => {
          try {
            const verify = await fetch(`${API_BASE}/api/auth/google/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: resp.credential })
            }).then(r => r.json());
            if (verify?.success) {
              setAuthUser(verify.user);
              setAuthToken(verify.token);
              try { localStorage.setItem('authUser', JSON.stringify(verify.user)); localStorage.setItem('authToken', verify.token); } catch {}
              await refreshCommunity(verify.token);
            }
          } catch {}
        }
      });
      window.google.accounts.id.prompt();
    } catch {}
  };
  const refreshCommunity = async (token = authToken) => {
    try {
      if (!token) return;
      const r = await fetch(`${API_BASE}/api/community/profile`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      if (r?.success) setIsCommunityMember(!!r.isMember);
    } catch {}
  };
  const joinCommunity = async () => {
    try {
      if (!authToken) {
        await beginGoogleSignIn();
        return;
      }
      const r = await fetch(`${API_BASE}/api/community/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      }).then(r => r.json());
      if (r?.success) setIsCommunityMember(true);
    } catch {}
  };

  const copyCurrentLink = async () => {
    try {
      const params = new URLSearchParams();
      if (filter && filter !== "all") params.set("filter", filter);
      if (selectedSource) params.set("source", selectedSource);
      if (selectedCountry) params.set("country", selectedCountry);
      if (searchTerm) params.set("q", searchTerm);
      if (!showImages) params.set("img", "0");
      const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      await navigator.clipboard.writeText(url);
      console.log("🔗 Copied URL:", url);
    } catch (e) {
      console.warn("Copy link failed:", e.message);
    }
  };

  const togglePinSource = () => {
    if (!selectedSource) return;
    const exists = pinnedSources.includes(selectedSource);
    const next = exists
      ? pinnedSources.filter((s) => s !== selectedSource)
      : [selectedSource, ...pinnedSources].slice(0, 12);
    setPinnedSources(next);
    try { localStorage.setItem('newsPinnedSources', JSON.stringify(next)); } catch {}
  };

  const togglePinCountry = () => {
    if (!selectedCountry) return;
    const exists = pinnedCountries.includes(selectedCountry);
    const next = exists
      ? pinnedCountries.filter((c) => c !== selectedCountry)
      : [selectedCountry, ...pinnedCountries].slice(0, 24);
    setPinnedCountries(next);
    try { localStorage.setItem('newsPinnedCountries', JSON.stringify(next)); } catch {}
  };

  // Keyboard shortcuts: "/" focus search, "i" toggle images
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        try { searchInputRef.current?.focus(); } catch {}
      } else if (e.key.toLowerCase() === "i" && !isTyping) {
        setShowImages((v) => !v);
      } else if (e.key.toLowerCase() === "b" && !isTyping) {
        // Best News toggle
        setUsePrioritized((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const saveCurrentSegment = () => {
    try {
      const name = (segmentName || "").trim();
      if (!name) return;
      const segment = {
        id: `seg-${Date.now()}`,
        name,
        filter,
        searchTerm,
        selectedSource,
        selectedCountry,
        showImages
      };
      const next = [segment, ...savedSegments].slice(0, 12);
      setSavedSegments(next);
      localStorage.setItem('newsSavedSegments', JSON.stringify(next));
      setSegmentName("");
    } catch (e) {
      console.warn("Failed to save segment:", e);
    }
  };

  const applySegment = (seg) => {
    try {
      if (!seg) return;
      setFilter(seg.filter || "all");
      setSearchTerm(seg.searchTerm || "");
      setSelectedSource(seg.selectedSource || null);
      setSelectedCountry(seg.selectedCountry || null);
      setShowImages(typeof seg.showImages === "boolean" ? seg.showImages : true);
    } catch (e) {}
  };

  const deleteSegment = (segId) => {
    try {
      const next = savedSegments.filter(s => s.id !== segId);
      setSavedSegments(next);
      localStorage.setItem('newsSavedSegments', JSON.stringify(next));
    } catch (e) {}
  };

  // Job search functionality
  const fetchJobs = async (query = searchQuery, loc = location, page = 0) => {
    setJobLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        l: loc,
        page: page.toString()
      });

      const response = await fetch(`${API_BASE}/api/jobs/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setJobs(data.jobs);
        setCurrentPage(page);
        
        if (data.cached) {
          console.log(`📦 Loaded ${data.jobs.length} cached jobs (${data.cache_age || 'recent'} cache)`);
        } else {
          console.log(`🔍 Loaded ${data.jobs.length} fresh jobs from Adzuna`);
        }
        
        if (data.apiUsage) {
          console.log(`📊 API Usage: ${data.apiUsage.daily}/${data.apiUsage.budget} (${data.apiUsage.percentage}%)`);
        }
      } else {
        console.error('Job search failed:', data.error);
        setJobs([]);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      setJobs([]);
    } finally {
      setJobLoading(false);
    }
  };

  const handleJobSearch = (e) => {
    e.preventDefault();
    fetchJobs(searchQuery, location, 0);
  };

  // FIXED: Safe API base URL
  const getApiBase = () => {
    return API_BASE;
  };

  const filterArticles = (filterType) => {
    setFilter(filterType);
    let next = allArticles;
    if (filterType === "ai") {
      next = allArticles.filter(
        (a) =>
          a?.category === "ai" ||
          a?.title?.toLowerCase().includes("ai") ||
          a?.title?.toLowerCase().includes("artificial intelligence")
      );
    } else if (filterType === "technology" || filterType === "tech") {
      next = allArticles.filter((a) => a?.category === "technology");
    } else if (filterType === "business") {
      next = allArticles.filter((a) => a?.category === "business");
    } else if (filterType === "economy") {
      next = allArticles.filter((a) => a?.category === "economy");
    }
    setArticles(next);
  };

  useEffect(() => {
    // EINSTEIN-LEVEL: Health check on mount
    const initializeConnection = async () => {
      try {
        const healthCheck = await fetchWithRetry(`${API_BASE}/health`, 1, 500);
        console.log("✅ Initial backend health:", healthCheck);

        // Log when backend resumes after idle sleep
        if (healthCheck.uptime < 60) {
          console.log(
            "🔄 Backend recently restarted (Railway wake-up detected)"
          );
        }
      } catch (healthErr) {
        console.warn("⚠️ Initial health check failed:", healthErr.message);
      }

      // Fetch news after health check
      fetchNews();
    };

    initializeConnection();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Once-per-day Welcome popup
  useEffect(() => {
    try {
      const key = 'caiTechHubSeenAt';
      const last = localStorage.getItem(key);
      const today = new Date().toISOString().slice(0,10);
      if (last !== today) {
        setShowWelcome(true);
        localStorage.setItem(key, today);
      }
    } catch {}
  }, []);

  // Persist UI preferences (news filter/search/images)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('newsPrefs') || '{}');
      if (saved.filter) {
        setFilter(saved.filter);
      }
      if (typeof saved.showImages === 'boolean') {
        setShowImages(saved.showImages);
      }
      if (typeof saved.searchTerm === 'string') {
        setSearchTerm(saved.searchTerm);
      }
      if (saved.selectedSource) {
        setSelectedSource(saved.selectedSource);
      }
      if (saved.selectedCountry) {
        setSelectedCountry(saved.selectedCountry);
      }
      if (typeof saved.usePrioritized === 'boolean') {
        setUsePrioritized(saved.usePrioritized);
      }
      // URL overrides
      const params = new URLSearchParams(window.location.search);
      const pFilter = params.get("filter");
      const pSource = params.get("source");
      const pCountry = params.get("country");
      const pSearch = params.get("q");
      const pImages = params.get("img");
      const pBest = params.get("best");
      if (pFilter) setFilter(pFilter);
      if (pSource) setSelectedSource(pSource);
      if (pCountry) setSelectedCountry(pCountry);
      if (pSearch) setSearchTerm(pSearch);
      if (pImages === "0") setShowImages(false);
      if (pBest === "1" || pBest === "true") setUsePrioritized(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('newsPrefs', JSON.stringify({
        filter,
        showImages,
        searchTerm,
        selectedSource,
        selectedCountry,
        usePrioritized
      }));
      const params = new URLSearchParams();
      if (filter && filter !== "all") params.set("filter", filter);
      if (searchTerm) params.set("q", searchTerm);
      if (selectedSource) params.set("source", selectedSource);
      if (selectedCountry) params.set("country", selectedCountry);
      if (!showImages) params.set("img", "0");
      if (usePrioritized) params.set("best", "1");
      const qs = params.toString();
      const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, "", next);
    } catch {}
  }, [filter, showImages, searchTerm, selectedSource, selectedCountry, usePrioritized]);

  // EINSTEIN-LEVEL: Resilient fetch with exponential backoff
  const fetchWithRetry = async (url, retries = 3, delay = 1000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        mode: "cors",
        cache: "no-cache",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Client error: HTTP ${response.status}`);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);

      if (
        retries > 0 &&
        (err.name === "AbortError" ||
          err.message.includes("HTTP 5") ||
          err.message.includes("fetch"))
      ) {
        const attempt = 4 - retries;
        console.warn(`🔄 Retry ${attempt}/3: ${err.message}`);
        console.log(`⏳ Exponential backoff: ${delay}ms (Railway wake-up)`);

        await new Promise((r) => setTimeout(r, delay));
        return fetchWithRetry(url, retries - 1, delay * 2); // Exponential backoff
      }
      throw err;
    }
  };

  const handleTileKeyDown = (event, handler, disabled = false) => {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (typeof handler === "function") {
        handler();
      }
    }
  };

  const openArticleRoute = (article) => {
    if (!article) return;
    if (!article.id && !article.url) return;
    const idOrUnknown = article.id || "unknown";
    const urlParam = article.url ? `?url=${encodeURIComponent(article.url)}` : "";
    navigate(`/article/${idOrUnknown}${urlParam}`);
  };

  const handleSubmitArticleCTA = () => {
    setShowStartupNews(false);
    setShowFansAIArticles(false);
    navigate('/ai-fans-race');
  };

  const handleStartupNewsCTA = async () => {
    const willShow = !showStartupNews;
    setShowStartupNews(willShow);
    if (willShow && startupArticles.length === 0) {
      try {
        const response = await fetchWithRetry(
          `${getApiBase()}/api/ai-news`
        );
        setStartupArticles(response.articles || []);
      } catch (error) {
        console.error("Failed to fetch startup news:", error);
      }
    }
  };

  const handleFansArticleCTA = async () => {
    const willShow = !showFansAIArticles;
    setShowFansAIArticles(willShow);
    if (willShow && fansAIArticles.length === 0) {
      try {
        const response = await fetchWithRetry(
          `${getApiBase()}/api/fans-ai-articles`
        );
        setFansAIArticles(response.articles || []);
      } catch (error) {
        console.error("Failed to fetch fans AI articles:", error);
      }
    }
  };

  const handleJobCTA = async () => {
    const willShow = !showJobSearch;
    setShowJobSearch(willShow);
    if (willShow && jobs.length === 0) {
      await fetchJobs();
    }
  };

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = usePrioritized ? "/api/global-news/prioritized" : "/api/global-news";
      console.log("🔍 FETCHING FROM:", `${API_BASE}${endpoint}`);
      const data = await fetchWithRetry(`${API_BASE}${endpoint}`);
      console.log("📊 RECEIVED DATA:", data);

      // DEBUG: Check article categories
      if (data.countries) {
        Object.values(data.countries).forEach((countryArticles) => {
          if (Array.isArray(countryArticles)) {
            countryArticles.slice(0, 3).forEach((article) => {
              console.log("🔍 ARTICLE DEBUG:", {
                title: article.title?.substring(0, 50),
                category: article.category,
                hasAIInTitle: article.title?.toLowerCase().includes("ai"),
                hasAIInDesc: article.description?.toLowerCase().includes("ai"),
              });
            });
          }
        });
      }

      // Extract articles safely from both buckets
      let extracted = [];
      if (data?.countries && typeof data.countries === "object") {
        for (const list of Object.values(data.countries)) {
          if (Array.isArray(list)) extracted.push(...list);
        }
      }
      if (Array.isArray(data?.global)) extracted.push(...data.global);

      // DEDUPLICATE: Remove duplicate articles by title
      const uniqueArticles = [];
      const seenTitles = new Set();

      extracted.forEach((article) => {
        if (article && article.title && !seenTitles.has(article.title)) {
          seenTitles.add(article.title);
          uniqueArticles.push(article);
        }
      });

      console.log(
        `🔄 DEDUPLICATION: ${extracted.length} → ${uniqueArticles.length} articles`
      );

      // Sort & render
      const sorted = uniqueArticles
        .filter((a) => a && a.title)
        .sort((a, b) => {
          const A = new Date(a.publishedAt || a.published_at || 0).getTime();
          const B = new Date(b.publishedAt || b.published_at || 0).getTime();
          return B - A;
        });

      setAllArticles(sorted);
      setArticles(sorted);
      setLastUpdate(data?.lastUpdate || new Date().toISOString());
    } catch (err) {
      setError(err.message || "Failed to load news");
      // do NOT clear lists – keep last good render
      // setAllArticles([]); setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Simplified process function without axios
  const processNewArticles = async () => {
    try {
      setLoading(true);
      console.log("🚀 Processing new articles...");

      const forceRefreshUrl = `${API_BASE}/api/cache/force-refresh`;
      const response = await fetch(forceRefreshUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        console.log("✅ Cache refresh successful");
        // Wait for cache to update
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await fetchNews();
      } else {
        throw new Error(result.error || "Refresh failed");
      }
    } catch (error) {
      console.error("❌ Cache refresh failed:", error);
      setError(`Refresh failed: ${error.message}`);
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const getRelevanceBadge = (score) => {
    if (!score) return "badge-info";
    if (score >= 85) return "badge-success";
    if (score >= 75) return "badge-warning";
    return "badge-info";
  };

  const getCategoryIcon = (category) => {
    const icons = {
      ai: "🥷",
      technology: "💻",
      business: "💼",
      economy: "📈",
    };
    return icons[category] || "📰";
  };

  // FIXED: Title-focused AI filtering
  const aiArticlesCount = allArticles.filter(
    (a) =>
      a?.category === "ai" ||
      a?.title?.toLowerCase().includes("ai") ||
      a?.title?.toLowerCase().includes("artificial intelligence")
  ).length;

  const avgRelevance =
    articles.length > 0
      ? Math.round(
          articles.reduce(
            (sum, a) => sum + (a.relScore || a.rel_score || 0),
            0
          ) / articles.length
        )
      : 0;

  if (loading && articles.length === 0) {
    return (
      <div className="container io-container">
        <div className="io-stack" style={{ marginTop: "1.5rem" }}>
          <div className="io-hero io-scan-wall io-bg-grid">
            <div className="io-title">
              📰 <TranslatedText>Live AI • Tech • Finance News</TranslatedText>
            </div>
            <div className="io-subtitle">
              <TranslatedText>Real-time global intelligence feed</TranslatedText> • <TranslatedText>Preparing content...</TranslatedText>
            </div>
          </div>
          {/* Skeleton stats */}
          <div className="grid grid-3">
            <div className="io-card u-p-12"><div className="io-skeleton" style={{ height: 18, width: 120, marginBottom: 8 }}></div><div className="io-skeleton" style={{ height: 28, width: 60 }}></div></div>
            <div className="io-card u-p-12"><div className="io-skeleton" style={{ height: 18, width: 120, marginBottom: 8 }}></div><div className="io-skeleton" style={{ height: 28, width: 60 }}></div></div>
            <div className="io-card u-p-12"><div className="io-skeleton" style={{ height: 18, width: 120, marginBottom: 8 }}></div><div className="io-skeleton" style={{ height: 28, width: 80 }}></div></div>
          </div>
          {/* Skeleton grid of articles */}
          <div className="io-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="io-card" style={{ padding: 12 }}>
                <div className="io-skeleton" style={{ height: 180, borderRadius: 12, marginBottom: 12 }}></div>
                <div className="io-skeleton" style={{ height: 16, width: "80%", marginBottom: 8 }}></div>
                <div className="io-skeleton" style={{ height: 14, width: "60%", marginBottom: 12 }}></div>
                <div className="io-skeleton" style={{ height: 12, width: "40%" }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="container io-container">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          style={{ marginBottom: "3rem" }}
        >
          {/* Title Section */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div 
              className="heading"
              style={{
                fontSize: "3rem",
                fontWeight: "bold",
                background: "linear-gradient(135deg, #00bcd4, #ff1493, #FFD700)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 0 20px rgba(0, 188, 212, 0.5)",
                marginBottom: "1rem"
              }}
            >
              📰 <TranslatedText>Live AI • Tech • Finance News</TranslatedText>
            </div>
            <div 
              className="text-muted"
              style={{
                fontSize: "1.4rem",
                color: "rgba(255, 255, 255, 0.8)",
                textShadow: "0 0 10px rgba(255, 255, 255, 0.3)"
              }}
            >
              <TranslatedText>
                Real-time global intelligence feed
              </TranslatedText>{" "}
              • <TranslatedText>Last update</TranslatedText>:{" "}
              {lastUpdate ? (
                new Date(lastUpdate).toLocaleTimeString()
              ) : (
                <TranslatedText>Unknown</TranslatedText>
              )}
            </div>
            {error && (
              <div style={{ color: "#ff6b6b", marginTop: "0.5rem" }}>
                ⚠️ <TranslatedText>{error}</TranslatedText>
              </div>
            )}
          </div>
          {/* Tabs / Search / Images toggle */}
          <div className="io-container" style={{ display: "flex", alignItems: "center", gap: "1rem", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div className="io-tabs">
              <div className={`io-tab ${filter === "all" ? "active" : ""}`} onClick={() => filterArticles("all")}><TranslatedText>All</TranslatedText></div>
              <div className={`io-tab ${filter === "ai" ? "active" : ""}`} onClick={() => filterArticles("ai")}><TranslatedText>AI</TranslatedText></div>
              <div className={`io-tab ${filter === "technology" ? "active" : ""}`} onClick={() => filterArticles("technology")}><TranslatedText>Tech</TranslatedText></div>
              <div className={`io-tab ${filter === "business" ? "active" : ""}`} onClick={() => filterArticles("business")}><TranslatedText>Business</TranslatedText></div>
              <div className={`io-tab ${filter === "economy" ? "active" : ""}`} onClick={() => filterArticles("economy")}><TranslatedText>Economy</TranslatedText></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div className="io-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="#66ccff"/></svg>
                <input
                  placeholder="Search articles..."
                  value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 ref={searchInputRef}
                />
               <button className="io-btn" onClick={copyCurrentLink}><TranslatedText>Copy Link</TranslatedText></button>
              </div>
              <div className={`io-switch ${showImages ? "on" : ""}`} onClick={() => setShowImages((v) => !v)}>
                <div className="knob"></div>
              </div>
              <div className="t-sm text-muted"><TranslatedText>Images</TranslatedText></div>
              <button
                className="io-pill"
                onClick={() => setUsePrioritized(v => !v)}
                style={{
                  background: usePrioritized ? 'rgba(0,255,127,0.18)' : 'rgba(255,255,255,0.08)',
                  border: usePrioritized ? '1px solid rgba(0,255,127,0.5)' : '1px solid rgba(255,255,255,0.2)',
                  color: '#fff'
                }}
              >
                {usePrioritized ? 'Best News ✓' : 'Best News'}
              </button>
            </div>
          </div>

          {/* Saved Segments: save/apply/delete */}
          <div className="io-container" style={{ display: "flex", alignItems: "center", gap: "0.75rem", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div className="io-search" style={{ minWidth: 260 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="#66ccff"/></svg>
              <input
                placeholder="Save current filters as segment..."
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
              />
              <button className="io-btn" onClick={saveCurrentSegment}><TranslatedText>Save</TranslatedText></button>
            </div>
            <div className="io-nav" style={{ overflowX: "auto", whiteSpace: "nowrap", flex: 1 }}>
              {savedSegments.map((seg) => (
                <span key={seg.id} className="io-pill" style={{ marginRight: 8 }}>
                  <button className="io-pill" onClick={() => applySegment(seg)}>{seg.name}</button>
                  <button className="io-pill danger" onClick={() => deleteSegment(seg.id)}>×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Pinned Sources / Countries */}
          <div className="io-container" style={{ display: "flex", alignItems: "center", gap: "0.75rem", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div className="io-nav" style={{ flex: 1, overflowX: "auto" }}>
              <span className="t-sm text-muted" style={{ marginRight: 8 }}><TranslatedText>Pinned Sources</TranslatedText>:</span>
              {pinnedSources.length === 0 && <span className="t-sm text-muted"><TranslatedText>None</TranslatedText></span>}
              {pinnedSources.map((src) => (
                <span key={src} className="io-pill" style={{ marginRight: 8 }}>
                  <button className="io-pill" onClick={() => setSelectedSource(src)}>{src}</button>
                  <button className="io-pill danger" onClick={() => {
                    const next = pinnedSources.filter(s => s !== src);
                    setPinnedSources(next);
                    try { localStorage.setItem('newsPinnedSources', JSON.stringify(next)); } catch {}
                  }}>×</button>
                </span>
              ))}
            </div>
            <div>
              <button className="io-btn" onClick={togglePinSource} disabled={!selectedSource}>
                {pinnedSources.includes(selectedSource || '') ? <TranslatedText>Unpin Source</TranslatedText> : <TranslatedText>Pin Source</TranslatedText>}
              </button>
            </div>
          </div>
          <div className="io-container" style={{ display: "flex", alignItems: "center", gap: "0.75rem", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <div className="io-nav" style={{ flex: 1, overflowX: "auto" }}>
              <span className="t-sm text-muted" style={{ marginRight: 8 }}><TranslatedText>Pinned Countries</TranslatedText>:</span>
              {pinnedCountries.length === 0 && <span className="t-sm text-muted"><TranslatedText>None</TranslatedText></span>}
              {pinnedCountries.map((cty) => (
                <span key={cty} className="io-pill" style={{ marginRight: 8 }}>
                  <button className="io-pill" onClick={() => setSelectedCountry(cty)}>{cty}</button>
                  <button className="io-pill danger" onClick={() => {
                    const next = pinnedCountries.filter(c => c !== cty);
                    setPinnedCountries(next);
                    try { localStorage.setItem('newsPinnedCountries', JSON.stringify(next)); } catch {}
                  }}>×</button>
                </span>
              ))}
            </div>
            <div>
              <button className="io-btn" onClick={togglePinCountry} disabled={!selectedCountry}>
                {pinnedCountries.includes(selectedCountry || '') ? <TranslatedText>Unpin Country</TranslatedText> : <TranslatedText>Pin Country</TranslatedText>}
              </button>
            </div>
          </div>

          {/* AI-Inspired Futuristic Carousel */}
          <div 
            style={{
              position: "relative",
              width: "100%",
              height: "120px",
              overflow: "hidden",
              background: "linear-gradient(135deg, rgba(0, 188, 212, 0.1), rgba(255, 20, 147, 0.1), rgba(255, 215, 0, 0.1))",
              backdropFilter: "blur(15px)",
              border: "2px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              boxShadow: "0 0 40px rgba(0, 188, 212, 0.3)",
            }}
          >
            {/* Animated Background Pattern */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "200%",
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(0, 188, 212, 0.2), transparent, rgba(255, 20, 147, 0.2), transparent)",
                animation: "carouselFlow 8s linear infinite",
                pointerEvents: "none",
              }}
            />

            {/* Button Rows */}
            <div className="io-toolbar" style={{ position: "relative", zIndex: 2, height: "100%" }}>
              {/* Professional Horizontal Button Layout */}
              <div style={{ 
                display: "flex", 
              justifyContent: "flex-start", 
                alignItems: "center",
                gap: "1.5rem",
              flexWrap: "nowrap",
              overflowX: "auto",
              whiteSpace: "nowrap"
              }}>
                {/* SUBMIT AI ARTICLE Button */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmitArticleCTA}
                  className="btn"
                  style={{
                    background: 'rgba(255, 215, 0, 0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255, 215, 0, 0.4)',
                    color: '#FFD700',
                    fontWeight: '800',
                    textShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
                    boxShadow: '0 0 25px rgba(255, 215, 0, 0.3)',
                    transition: 'all 0.3s ease',
                    minWidth: '200px',
                    height: '50px',
                    borderRadius: '25px',
                    fontSize: '0.9rem'
                  }}
                >
                  🚀 <TranslatedText>SUBMIT AI ARTICLE</TranslatedText> 🏁
                </motion.button>

                {/* AI NEWS Button */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartupNewsCTA}
                  className="btn"
                  disabled={loading}
                  style={{
                    background: 'rgba(255, 20, 147, 0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255, 20, 147, 0.4)',
                    color: '#ff1493',
                    fontWeight: '800',
                    textShadow: '0 0 15px rgba(255, 20, 147, 0.8)',
                    boxShadow: '0 0 25px rgba(255, 20, 147, 0.3)',
                    transition: 'all 0.3s ease',
                    minWidth: '150px',
                    height: '50px',
                    borderRadius: '25px',
                    fontSize: '0.9rem'
                  }}
                >
                  🚀 <TranslatedText>AI NEWS</TranslatedText>
                </motion.button>

                {/* FANS AI Button */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFansArticleCTA}
                  className="btn"
                  disabled={loading}
                  style={{
                    background: 'rgba(0, 255, 0, 0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(0, 255, 0, 0.4)',
                    color: '#00ff00',
                    fontWeight: '800',
                    textShadow: '0 0 15px rgba(0, 255, 0, 0.8)',
                    boxShadow: '0 0 25px rgba(0, 255, 0, 0.3)',
                    transition: 'all 0.3s ease',
                    minWidth: '130px',
                    height: '50px',
                    borderRadius: '25px',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace'
                  }}
                >
                  🔥 <TranslatedText>FANS AI</TranslatedText>
                </motion.button>

                {/* JOB SEARCH Button */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleJobCTA}
                  className="btn"
                  disabled={loading}
                  style={{
                    background: 'rgba(0, 188, 212, 0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(0, 188, 212, 0.4)',
                    color: '#00bcd4',
                    fontWeight: '800',
                    textShadow: '0 0 15px rgba(0, 188, 212, 0.8)',
                    boxShadow: '0 0 25px rgba(0, 188, 212, 0.3)',
                    transition: 'all 0.3s ease',
                    minWidth: '150px',
                    height: '50px',
                    borderRadius: '25px',
                    fontSize: '0.9rem'
                  }}
                >
                  💼 <TranslatedText>JOB SEARCH</TranslatedText>
                </motion.button>

                {/* Command Center Button */}
                <motion.button 
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/")} 
                  className="btn" 
                  style={{ 
                    background: 'rgba(220, 53, 69, 0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(220, 53, 69, 0.4)',
                    color: '#dc3545',
                    fontWeight: '800',
                    textShadow: '0 0 15px rgba(220, 53, 69, 0.8)',
                    boxShadow: '0 0 25px rgba(220, 53, 69, 0.3)',
                    transition: 'all 0.3s ease',
                    minWidth: '160px',
                    height: '50px',
                    borderRadius: '25px',
                    fontSize: '0.9rem'
                  }}
                >
                  ← <TranslatedText>Command Center</TranslatedText>
                </motion.button>

              {isAdmin && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      try {
                        await fetch(`${API_BASE}/api/refresh-news`, { method: "POST" });
                        await fetch(`${API_BASE}/api/refresh-news`, { method: "POST" });
                        await fetchNews();
                      } catch (e) {
                        console.warn("Hydrate ×2 failed:", e);
                      }
                    }}
                    className="btn"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      minWidth: '120px',
                      height: '50px',
                      borderRadius: '25px',
                      fontSize: '0.9rem'
                    }}
                  >
                    Hydrate ×2
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      try {
                        await fetch(`${API_BASE}/api/articles/fill-images`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ limit: 100 })
                        });
                        await fetchNews();
                      } catch (e) {
                        console.warn("Fill images failed:", e);
                      }
                    }}
                    className="btn"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      minWidth: '120px',
                      height: '50px',
                      borderRadius: '25px',
                      fontSize: '0.9rem'
                    }}
                  >
                    Fill Images
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      try {
                        await fetch(`${API_BASE}/api/cai/train`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ limit: 400 })
                        });
                      } catch (e) {
                        console.warn("Train cAI failed:", e);
                      }
                    }}
                    className="btn"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      minWidth: '120px',
                      height: '50px',
                      borderRadius: '25px',
                      fontSize: '0.9rem'
                    }}
                  >
                    Train cAI
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setUsePrioritized(v => !v)}
                    className="btn"
                    style={{
                      background: usePrioritized ? 'rgba(0,255,127,0.18)' : 'rgba(255,255,255,0.08)',
                      border: usePrioritized ? '1px solid rgba(0,255,127,0.5)' : '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      minWidth: '120px',
                      height: '50px',
                      borderRadius: '25px',
                      fontSize: '0.9rem'
                    }}
                  >
                    {usePrioritized ? 'Best News ✓' : 'Best News'}
                  </motion.button>
                </>
              )}
              </div>
            </div>

            {/* Floating Particles Effect */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: `
                  radial-gradient(circle at 20% 30%, rgba(0, 188, 212, 0.3) 2px, transparent 2px),
                  radial-gradient(circle at 80% 70%, rgba(255, 20, 147, 0.3) 2px, transparent 2px),
                  radial-gradient(circle at 60% 20%, rgba(255, 215, 0, 0.3) 2px, transparent 2px)
                `,
                backgroundSize: "100px 100px, 150px 150px, 120px 120px",
                animation: "particleFloat 12s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          </div>
        </motion.div>

        {/* Stats Bar */}
        <motion.div variants={itemVariants} className="grid grid-3" style={{ marginBottom: "2rem" }}>
          <IOStatCard
            title={<TranslatedText>Total Articles</TranslatedText>}
            value={allArticles.length}
            onClick={() => filterArticles("all")}
            active={filter === "all"}
          />
          <IOStatCard
            title={<TranslatedText>AI Articles</TranslatedText>}
            value={aiArticlesCount}
            onClick={() => filterArticles("ai")}
            active={filter === "ai"}
          />
          <IOStatCard
            title={<TranslatedText>Avg Relevance</TranslatedText>}
            value={`${avgRelevance}/100`}
          />
        </motion.div>

        {/* KPI Banner */}
        <div className="io-banner" style={{ marginBottom: "1rem" }}>
          <div className="t-md">
            <strong><TranslatedText>Today</TranslatedText></strong>:{" "}
            <TranslatedText>Total</TranslatedText> {allArticles.length} •{" "}
            <TranslatedText>AI</TranslatedText> {aiArticlesCount} •{" "}
            <TranslatedText>Sources</TranslatedText>{" "}
            {Array.from(new Set(allArticles.map(a => a?.source).filter(Boolean))).length}
          </div>
          <div>
            <button className="io-btn" onClick={() => setShowImages(v => !v)}>
              {showImages ? "🙈 Hide Images" : "🖼️ Show Images"}
            </button>
            <button className="io-btn" onClick={exportNewsCSV} style={{ marginLeft: 8 }}>
              ⬇️ <TranslatedText>Export CSV</TranslatedText>
            </button>
            <button className="io-btn ghost" onClick={clearNewsFilters} style={{ marginLeft: 8 }}>
              ♻️ <TranslatedText>Clear</TranslatedText>
            </button>
          </div>
        </div>

        {/* Trending Sources */}
        <div className="io-card u-p-12" style={{ marginBottom: "1rem" }}>
          <div className="subheading" style={{ marginBottom: 8 }}>
            <TranslatedText>Trending Sources</TranslatedText>
          </div>
          <div className="io-nav">
            {Object.entries(
              allArticles.reduce((acc, a) => {
                const s = a?.source || "Unknown";
                acc[s] = (acc[s] || 0) + 1;
                return acc;
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([name, count]) => (
                <div
                  key={name}
                  className={`io-pill ${selectedSource === name ? "active" : ""}`}
                  onClick={() => setSelectedSource(selectedSource === name ? null : name)}
                >
                  {name} • {count}
                </div>
              ))}
          </div>
        </div>

        {/* Country Snapshot */}
        <div className="io-card u-p-12" style={{ marginBottom: "1rem" }}>
          <div className="subheading" style={{ marginBottom: 8 }}>
            <TranslatedText>Country Snapshot</TranslatedText>
          </div>
          <div className="io-nav">
            {Object.entries(
              allArticles.reduce((acc, a) => {
                const c = a?.country || "GLOBAL";
                acc[c] = (acc[c] || 0) + 1;
                return acc;
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([code, count]) => (
                <div
                  key={code}
                  className={`io-pill ${selectedCountry === code ? "active" : ""}`}
                  onClick={() => setSelectedCountry(selectedCountry === code ? null : code)}
                >
                  {code} • {count}
                </div>
              ))}
          </div>
        </div>

        {/* Debug Info */}
        {false && (
          <motion.div
            variants={itemVariants}
            className="card"
            style={{
              background: "#1a1a2e",
              border: "1px solid #ff6b6b",
              marginBottom: "1rem",
            }}
          >
            <div style={{ color: "#ff6b6b", fontSize: "0.9rem" }}>
              🔍 DEBUG: articles={articles.length} | allArticles=
              {allArticles.length} | loading={loading.toString()}
              <br />
              🌍 API: {API_BASE}
              <br />
              <button
                onClick={() => {
                  console.log("🧪 Manual API Test");
                  fetch(API_BASE + "/api/global-news")
                    .then((res) => res.json())
                    .then((data) => console.log("✅ Manual test result:", data))
                    .catch((err) =>
                      console.error("❌ Manual test failed:", err)
                    );
                }}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.8rem",
                }}
              >
                🧪 <TranslatedText>Test API in Console</TranslatedText>
              </button>
            </div>
          </motion.div>
        )}

        {/* Articles Feed */}
        {articles.length === 0 ? (
          <motion.div variants={itemVariants} className="card">
            <div className="text-center text-muted">
              {loading ? (
                <TranslatedText>Loading articles...</TranslatedText>
              ) : (
                <TranslatedText>No articles available</TranslatedText>
              )}
              {error && (
                <div style={{ marginTop: "1rem", color: "#ff6b6b" }}>
                  <TranslatedText>Error</TranslatedText>: {error}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            className="grid"
            style={{ gap: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
          >
            {articles
              .filter((a) => {
                if (!searchTerm) return true;
                const t = (a?.title || "").toLowerCase();
                const d = (a?.description || "").toLowerCase();
                const s = searchTerm.toLowerCase();
                return t.includes(s) || d.includes(s);
              })
              .filter((a) => {
                if (selectedSource && a?.source !== selectedSource) return false;
                if (selectedCountry && (a?.country || "GLOBAL") !== selectedCountry) return false;
                return true;
              })
              .map((article, index) => {
                const openArticle = () => {
                  if (article.id) {
                    navigate(`/article/${article.id}`);
                  } else if (article.url) {
                    window.open(article.url, "_blank");
                  }
                };
                return (
              <motion.div
                key={article.id || `article-${index}`}
                variants={itemVariants}
                whileHover={{ scale: 1.01 }}
                className="io-card article-card fx-float fx-glow"
                style={{ position: "relative", cursor: "pointer" }}
                role="button"
                tabIndex={0}
                onClick={openArticle}
                onKeyDown={(event) => handleTileKeyDown(event, openArticle)}
              >
                {(article.category === "ai" || (article.title && article.title.toLowerCase().includes("ai"))) && (
                  <div className="io-ribbon io-ribbon-ai">AI</div>
                )}
                {(article.relScore || article.rel_score) >= 85 && (
                  <div className="io-ribbon io-ribbon-hot" style={{ left: "unset", right: "10px" }}>HOT</div>
                )}
                {/* Optional article image */}
                {showImages ? (
                  article.image_url ? (
                    <img src={article.image_url} alt="" className="io-article-image" style={{ marginBottom: "0.75rem" }} />
                  ) : (
                    <div className="io-article-image" style={{ marginBottom: "0.75rem" }} />
                  )
                ) : null}
                <div className="flex-between" style={{ marginBottom: "1rem" }}>
                  <div className="flex">
                    <span style={{ fontSize: "1.2rem", marginRight: "0.5rem" }}>
                      {getCategoryIcon(article.category)}
                    </span>
                    <div>
                      <div
                        className="subheading"
                        style={{ marginBottom: "0.25rem" }}
                      >
                        <TranslatedArticleTitle
                          title={article.title || "Untitled Article"}
                        />
                      </div>
                      <div
                        className="text-muted"
                        style={{ fontSize: "0.8rem" }}
                      >
                        {article.source}{" "}
                        {article.author && `• ${article.author}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {(article.relScore || article.rel_score) && (
                      <span
                        className={`badge ${getRelevanceBadge(
                          article.relScore || article.rel_score
                        )}`}
                      >
                        REL {article.relScore || article.rel_score}
                      </span>
                    )}
                    <span className="badge badge-info">
                      <TranslatedText>{(article.category || "news").toUpperCase()}</TranslatedText>
                    </span>
                  </div>
                </div>

                {article.description && (
                  <p
                    className="text-secondary"
                    style={{ marginBottom: "1rem", lineHeight: "1.5" }}
                  >
                    <TranslatedText>
                      {article.description.length > 200
                        ? `${article.description.substring(0, 200)}...`
                        : article.description}
                    </TranslatedText>
                  </p>
                )}

                <div className="article-meta">
                  <span>🌍 <TranslatedText>{article.country || "Global"}</TranslatedText></span>
                  <span>
                    ⏰{" "}
                    {article.publishedAt || article.published_at
                      ? new Date(
                          article.publishedAt || article.published_at
                        ).toLocaleTimeString()
                      : <TranslatedText>Recent</TranslatedText>}
                  </span>
                </div>

                <div
                  className="flex flex-wrap gap-1"
                  style={{ marginTop: "1rem" }}
                >
                  {article.url && (
                    <MillionDollarArticleButton article={article} />
                  )}
                  <button
                    onClick={() =>
                      navigate(`/country/${article.country || "global"}`)
                    }
                    className="btn"
                  >
                    📊 <TranslatedText>Analysis</TranslatedText>
                  </button>
                </div>
              </motion.div>
            );})}
          </motion.div>
        )}

        {/* Refresh Button */}
        {articles.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="text-center"
            style={{ marginTop: "2rem" }}
          >
            <button onClick={fetchNews} className="btn btn-primary">
              🔄 <TranslatedText>Refresh Feed</TranslatedText>
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* STARTUP NEWS - PINK BEAM ANIMATION */}
      {showStartupNews && (
        <motion.div
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "400px",
            height: "100vh",
            background:
              "linear-gradient(135deg, rgba(255, 20, 147, 0.15), rgba(255, 105, 180, 0.1))",
            backdropFilter: "blur(10px)",
            zIndex: 1000,
            padding: "2rem",
            overflowY: "auto",
            boxShadow: "-10px 0 30px rgba(255, 20, 147, 0.3)",
          }}
        >
          {/* Pink Beam Effect */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, rgba(255, 20, 147, 0.3), transparent)",
              animation: "pinkBeam 2s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          {/* Close Button */}
          <button
            onClick={() => setShowStartupNews(false)}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "rgba(255, 255, 255, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "white",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
          >
            ×
          </button>

          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ marginBottom: "2rem", textAlign: "center" }}
          >
            <h2
              style={{
                color: "white",
                fontSize: "1.5rem",
                fontWeight: "bold",
                textShadow: "0 0 10px rgba(255, 255, 255, 0.5)",
                marginBottom: "0.5rem",
              }}
            >
              <TranslatedText>BOOM! 💥</TranslatedText>
            </h2>
            <h3
              style={{
                color: "white",
                fontSize: "1rem",
                textShadow: "0 0 5px rgba(255, 255, 255, 0.3)",
              }}
            >
              <TranslatedText>WEEKLY STARTUP NEWS</TranslatedText>
            </h3>
          </motion.div>

          {/* Startup Articles */}
          {startupArticles.length > 0 ? (
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {startupArticles.map((article, index) => (
                <motion.div
                  key={article.id || index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="card article-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openArticleRoute(article)}
                  onKeyDown={(event) => handleTileKeyDown(event, () => openArticleRoute(article))}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 20, 147, 0.3)",
                    backdropFilter: "blur(5px)",
                    marginBottom: "1rem",
                    cursor: "pointer",
                  }}
                >
                  <div
                    className="flex-between"
                    style={{ marginBottom: "1rem" }}
                  >
                    <div>
                      <span
                        className="badge"
                        style={{
                          background: "rgba(255, 20, 147, 0.2)",
                          color: "#ff1493",
                          border: "1px solid rgba(255, 20, 147, 0.3)",
                        }}
                      >
                        🚀 STARTUP #{index + 1}
                      </span>
                    </div>
                    <div
                      className="text-muted"
                      style={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      {article.source}
                      {article.publishedAt && (
                        <span style={{ marginLeft: '10px', fontSize: '0.9em' }}>
                          • {new Date(article.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <TranslatedArticleTitle
                    title={article.title}
                    className="article-title"
                    style={{
                      color: "white",
                      marginBottom: "1rem",
                      fontSize: "1rem",
                      lineHeight: "1.4",
                    }}
                  />

                  {article.description && (
                    <p
                      className="article-description"
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        marginBottom: "1rem",
                        lineHeight: "1.5",
                        fontSize: "0.9rem",
                      }}
                    >
                      <TranslatedText>
                        {article.description.length > 150
                          ? article.description.substring(0, 150) + "..."
                          : article.description}
                      </TranslatedText>
                    </p>
                  )}

                  <div className="flex" style={{ gap: "0.5rem" }}>
                    <button
                      className="btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        openArticleRoute(article);
                      }}
                      style={{
                        background: "rgba(255, 20, 147, 0.2)",
                        border: "1px solid rgba(255, 20, 147, 0.3)",
                        color: "#ff1493",
                        fontSize: "0.8rem",
                      }}
                    >
                      🔗 <TranslatedText>Read Article</TranslatedText>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "1rem",
              }}
            >
              <TranslatedText>Loading startup news...</TranslatedText>
            </div>
          )}
        </motion.div>
      )}

      {/* JOB SEARCH - BLUE BEAM ANIMATION (LEFT SIDE - EXACT COPY OF AI NEWS PATTERN) */}
      {showJobSearch && (
        <motion.div
          initial={{ opacity: 0, x: "-100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "-100%" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "400px",
            height: "100vh",
            background:
              "linear-gradient(135deg, rgba(0, 188, 212, 0.15), rgba(0, 151, 167, 0.1))",
            backdropFilter: "blur(10px)",
            zIndex: 1000,
            padding: "2rem",
            overflowY: "auto",
            boxShadow: "10px 0 30px rgba(0, 188, 212, 0.3)",
          }}
        >
          {/* Blue Beam Effect */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, rgba(0, 188, 212, 0.3), transparent)",
              animation: "blueBeam 2s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          {/* Close Button */}
          <button
            onClick={() => setShowJobSearch(false)}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "rgba(255, 255, 255, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "white",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
          >
            ×
          </button>

          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ marginBottom: "2rem", textAlign: "center" }}
          >
            <h2
              style={{
                color: "white",
                fontSize: "1.5rem",
                fontWeight: "bold",
                textShadow: "0 0 10px rgba(255, 255, 255, 0.5)",
                marginBottom: "0.5rem",
              }}
            >
              💼 <TranslatedText>JOB SEARCH</TranslatedText>
            </h2>
            <h3
              style={{
                color: "white",
                fontSize: "1rem",
                textShadow: "0 0 5px rgba(255, 255, 255, 0.3)",
              }}
            >
              <TranslatedText>POWERED BY ADZUNA</TranslatedText>
            </h3>
          </motion.div>

          {/* Job Search Form - Compact */}
          <motion.form
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            onSubmit={handleJobSearch}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(0, 188, 212, 0.3)",
              borderRadius: "15px",
              padding: "15px",
              marginBottom: "15px",
              backdropFilter: "blur(5px)",
            }}
          >
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Job Title"
                className="job-search-input"
              />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="job-search-input"
              />
            </div>

            <button
              type="submit"
              disabled={jobLoading}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #00bcd4, #0097a7)",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: jobLoading ? "not-allowed" : "pointer",
                opacity: jobLoading ? 0.7 : 1,
              }}
            >
              {jobLoading ? (
                <TranslatedText>Searching...</TranslatedText>
              ) : (
                <>🔍 <TranslatedText>Search Jobs</TranslatedText></>
              )}
            </button>
          </motion.form>

          {/* Job Results */}
          {jobs.length > 0 ? (
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {jobs.map((job, index) => (
                <motion.div
                  key={job.id || index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="card article-card"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(0, 188, 212, 0.3)",
                    backdropFilter: "blur(5px)",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    className="flex-between"
                    style={{ marginBottom: "1rem" }}
                  >
                    <div>
                      <span
                        className="badge"
                        style={{
                          background: "rgba(0, 188, 212, 0.2)",
                          color: "#00bcd4",
                          border: "1px solid rgba(0, 188, 212, 0.3)",
                        }}
                      >
                        💼 JOB #{index + 1}
                      </span>
                    </div>
                    <div
                      className="text-muted"
                      style={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      {job.source}
                    </div>
                  </div>

                  <h4
                    style={{
                      color: "white",
                      marginBottom: "1rem",
                      fontSize: "1rem",
                      lineHeight: "1.4",
                    }}
                  >
                    {job.title}
                  </h4>

                  <div
                    style={{
                      color: "#00bcd4",
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    🏢 {job.company}
                  </div>

                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    📍 {job.location}
                  </div>

                  {job.salary && job.salary !== "Not specified" && (
                    <p
                      style={{
                        color: "#4caf50",
                        fontWeight: "600",
                        marginBottom: "1rem",
                        lineHeight: "1.5",
                        fontSize: "0.9rem",
                      }}
                    >
                      💰 {job.salary}
                    </p>
                  )}

                  <div className="flex" style={{ gap: "0.5rem" }}>
                    <a
                      href={`/job/${job.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{
                        background: "rgba(0, 188, 212, 0.2)",
                        border: "1px solid rgba(0, 188, 212, 0.3)",
                        color: "#00bcd4",
                        fontSize: "0.8rem",
                      }}
                    >
                      🔗 <TranslatedText>Apply Now</TranslatedText>
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "1rem",
              }}
            >
              {jobLoading ? (
                <TranslatedText>Loading jobs...</TranslatedText>
              ) : (
                <TranslatedText>No jobs found. Try different keywords.</TranslatedText>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* FANS AI ARTICLES - GREEN PANEL (INDEPENDENT) */}
      {showFansAIArticles && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            position: "fixed",
            bottom: 0,
            right: 0,
            width: "400px",
            height: "50vh",
            background:
              "linear-gradient(135deg, rgba(0, 255, 0, 0.15), rgba(50, 205, 50, 0.1))",
            backdropFilter: "blur(10px)",
            zIndex: 1000,
            padding: "2rem",
            overflowY: "auto",
            boxShadow: "0 -10px 30px rgba(0, 255, 0, 0.3)",
            borderTop: "2px solid rgba(0, 255, 0, 0.3)",
            borderLeft: "2px solid rgba(0, 255, 0, 0.3)",
          }}
        >
          {/* Green Hacker Effect */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(180deg, transparent, rgba(0, 255, 0, 0.2), transparent)",
              animation: "greenHacker 3s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          {/* Close Button */}
          <button
            onClick={() => setShowFansAIArticles(false)}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "rgba(0, 255, 0, 0.2)",
              border: "1px solid rgba(0, 255, 0, 0.3)",
              color: "#00ff00",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              fontSize: "1.2rem",
              fontWeight: "bold",
            }}
          >
            ×
          </button>

          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ marginBottom: "2rem", textAlign: "center" }}
          >
            <h2
              style={{
                color: "#00ff00",
                fontSize: "1.5rem",
                fontWeight: "bold",
                textShadow: "0 0 10px rgba(0, 255, 0, 0.8)",
                marginBottom: "0.5rem",
                fontFamily: "monospace",
              }}
            >
              <TranslatedText>🔥 FANS AI ARTICLES</TranslatedText>
            </h2>
            <h3
              style={{
                color: "rgba(0, 255, 0, 0.8)",
                fontSize: "1rem",
                textShadow: "0 0 5px rgba(0, 255, 0, 0.5)",
                fontFamily: "monospace",
              }}
            >
              <TranslatedText>COMMUNITY SUBMISSIONS</TranslatedText>
            </h3>
          </motion.div>

          {/* Fans AI Articles */}
          {fansAIArticles.length > 0 ? (
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <div className="flex" style={{ justifyContent: "space-between", marginBottom: 10, gap: 8, alignItems: "center" }}>
                <div>
                  <button
                    className="btn"
                    onClick={() => navigate('/ai-fans-race')}
                    style={{
                      background: "rgba(0, 255, 0, 0.15)",
                      border: "1px solid rgba(0, 255, 0, 0.35)",
                      color: "#00ff00",
                      fontSize: "0.8rem",
                      fontFamily: "monospace",
                    }}
                  >
                    🚀 <TranslatedText>Submit AI Article</TranslatedText>
                  </button>
                </div>
                <button className="btn" onClick={joinCommunity} style={{ fontFamily: "monospace" }}>
                  {isCommunityMember ? '🥷 Joined cAI Community' : '🥷 Join cAI Community'}
                </button>
              </div>
              {fansAIArticles.map((article, index) => (
                <motion.div
                  key={article.id || index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="card article-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openArticleRoute(article)}
                  onKeyDown={(event) => handleTileKeyDown(event, () => openArticleRoute(article))}
                  style={{
                    background: "rgba(0, 255, 0, 0.05)",
                    border: "1px solid rgba(0, 255, 0, 0.3)",
                    backdropFilter: "blur(5px)",
                    marginBottom: "1rem",
                    cursor: "pointer",
                  }}
                >
                  <div
                    className="flex-between"
                    style={{ marginBottom: "1rem" }}
                  >
                    <div>
                      <span
                        className="badge"
                        style={{
                          background: "rgba(0, 255, 0, 0.2)",
                          color: "#00ff00",
                          border: "1px solid rgba(0, 255, 0, 0.3)",
                          fontFamily: "monospace",
                        }}
                      >
                        🚀 ARTICLE #{index + 1}
                      </span>
                    </div>
                    <div
                      className="text-muted"
                      style={{ 
                        color: "rgba(0, 255, 0, 0.7)",
                        fontFamily: "monospace" 
                      }}
                    >
                      {article.author || "Anonymous"}
                      {article.createdAt && (
                        <span style={{ marginLeft: '10px', fontSize: '0.9em' }}>
                          • {new Date(article.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <TranslatedArticleTitle
                    title={article.title}
                    className="article-title"
                    style={{
                      color: "#00ff00",
                      marginBottom: "1rem",
                      fontSize: "1rem",
                      lineHeight: "1.4",
                      fontFamily: "monospace",
                      textShadow: "0 0 5px rgba(0, 255, 0, 0.5)",
                    }}
                  />

                  {article.content && (
                    <p
                      className="article-description"
                      style={{
                        color: "rgba(0, 255, 0, 0.8)",
                        marginBottom: "1rem",
                        lineHeight: "1.5",
                        fontSize: "0.9rem",
                        fontFamily: "monospace",
                      }}
                    >
                      <TranslatedText>
                        {article.content.length > 150
                          ? article.content.substring(0, 150) + "..."
                          : article.content}
                      </TranslatedText>
                    </p>
                  )}

                  <div className="flex" style={{ gap: "0.5rem" }}>
                    <button
                      className="btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        openArticleRoute(article);
                      }}
                      style={{
                        background: "rgba(0, 255, 0, 0.2)",
                        border: "1px solid rgba(0, 255, 0, 0.3)",
                        color: "#00ff00",
                        fontSize: "0.8rem",
                        fontFamily: "monospace",
                      }}
                    >
                      🔗 <TranslatedText>Read More</TranslatedText>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "rgba(0, 255, 0, 0.7)",
                fontSize: "1rem",
                fontFamily: "monospace",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚀</div>
              <TranslatedText>No community articles yet!</TranslatedText>
              <br />
              <TranslatedText>Be the first to submit an AI article in the Fans Race!</TranslatedText>
            </div>
          )}
        </motion.div>
      )}

    </div>

    {/* Welcome Modal */}
    {showWelcome && (
      <div className="io-welcome-modal" onClick={() => setShowWelcome(false)}>
        <div className="io-welcome-card" onClick={(e) => e.stopPropagation()}>
          <div className="io-welcome-title">🥷 Welcome to cAI TechHub</div>
          <div className="io-welcome-subtitle">
            Your weekly AI-powered job & tech discovery. Set your preferences in the Job Search panel via “cAI TechHub”.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn" onClick={() => setShowWelcome(false)}>Later</button>
            <button className="btn btn-primary" onClick={() => { setShowWelcome(false); setShowJobSearch(true); }}>
              Explore
            </button>
          </div>
        </div>
      </div>
    )}


    </>
  );
}
