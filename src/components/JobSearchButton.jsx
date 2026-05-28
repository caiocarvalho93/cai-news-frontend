import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import TranslatedText from "./TranslatedText";
import CAIAgentPanel from "./CAIAgentPanel";
import API_BASE from "../config/api";

// Global state to ensure only one job search panel is open at a time
let globalJobSearchState = {
  isOpen: false,
  activeInstance: null
};

const JobSearchButton = () => {
  const [showJobSearch, setShowJobSearch] = useState(false);
  const instanceId = useState(() => Math.random().toString(36).substr(2, 9))[0];
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('software engineering');
  const [location, setLocation] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
	const [showCAI, setShowCAI] = useState(false);
  const [localFilter, setLocalFilter] = useState("");
  const [onlySalary, setOnlySalary] = useState(false);
  const [level, setLevel] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState("");
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [showSignIn, setShowSignIn] = useState(false);

  // Load Google Identity script and set up sign-in
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

  const loadSavedJobs = useCallback(async (token) => {
    if (!token) return;
    try {
      const r = await fetch(`${API_BASE}/api/user/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());
      if (r?.success) {
        const ids = new Set(r.items.map((i) => i.job_id));
        setSavedJobIds(ids);
      }
    } catch (error) {
      console.warn("Failed to load saved jobs:", error);
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const storedUser = window.localStorage.getItem('authUser');
      const storedToken = window.localStorage.getItem('authToken');
      if (storedUser) {
        setAuthUser(JSON.parse(storedUser));
      }
      if (storedToken) {
        setAuthToken(storedToken);
        loadSavedJobs(storedToken);
      }
    } catch (error) {
      console.warn("Job search auth restore failed:", error);
    }
  }, [loadSavedJobs]);

  const beginGoogleSignIn = async () => {
    try {
      const ok = await initGoogle();
      if (!ok) {
        alert('Google Sign-In unavailable. Please try again later.');
        return;
      }
      const clientIdRes = await fetch(`${API_BASE}/api/public-config`).then(r => r.json()).catch(() => ({}));
      const clientId = clientIdRes?.googleClientId || process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        alert('Sign-In not configured.');
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const verify = await fetch(`${API_BASE}/api/auth/google/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: response.credential })
            }).then(r => r.json());
            if (verify?.success) {
              setAuthUser(verify.user);
              setAuthToken(verify.token);
              setShowSignIn(false);
              try {
                window.localStorage.setItem('authUser', JSON.stringify(verify.user));
                window.localStorage.setItem('authToken', verify.token);
              } catch {}
              await loadSavedJobs(verify.token);
            } else {
              alert('Sign-In failed.');
            }
          } catch (e) {
            alert('Sign-In failed.');
          }
        }
      });
      window.google.accounts.id.prompt();
    } catch {
      alert('Sign-In failed.');
    }
  };

  const toggleSaveJob = async (jobId) => {
    try {
      if (!authToken) {
        setShowSignIn(true);
        return;
      }
      if (savedJobIds.has(jobId)) {
        await fetch(`${API_BASE}/api/user/jobs/${jobId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` }
        });
        const next = new Set(savedJobIds);
        next.delete(jobId);
        setSavedJobIds(next);
      } else {
        const r = await fetch(`${API_BASE}/api/user/jobs/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ jobId })
        }).then(r => r.json());
        if (r?.success) {
          const next = new Set(savedJobIds);
          next.add(jobId);
          setSavedJobIds(next);
        }
      }
    } catch {
      // no-op
    }
  };

  const exportJobsCSV = () => {
    try {
      const header = ["Title", "Company", "Location", "Salary", "Source", "URL"];
      const filtered = jobs.filter((job) => {
        if (onlySalary) {
          const hasSalary = job.salary && job.salary !== "Not specified";
          if (!hasSalary) return false;
        }
        if (!localFilter) return true;
        const f = localFilter.toLowerCase();
        return (
          (job.title || "").toLowerCase().includes(f) ||
          (job.company || "").toLowerCase().includes(f) ||
          (job.location || "").toLowerCase().includes(f)
        );
      });
      const rows = filtered.map((j) => [
        (j?.title || "").replace(/"/g, '""'),
        (j?.company || "").replace(/"/g, '""'),
        (j?.location || "").replace(/"/g, '""'),
        (j?.salary || "").replace(/"/g, '""'),
        (j?.source || "").replace(/"/g, '""'),
        j?.url || ""
      ]);
      const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `jobs_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("Job CSV export failed:", e);
    }
  };

  const fetchJobs = async (query = searchQuery, loc = location, page = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        l: loc,
        page: page.toString(),
        level
      });

		const response = await fetch(`${API_BASE}/api/jobs/search?${params}`);
      const data = await response.json();

      if (data.success) {
        // Normalize salary for consistent UI filters
        const normalized = (data.jobs || []).map((j) => {
          const salary =
            j.salary_display ||
            (j.salary_min && j.salary_max
              ? `$${j.salary_min} - $${j.salary_max}`
              : "Not specified");
          return { ...j, salary };
        });
        setJobs(normalized);
        setCurrentPage(page);
        
        // Show cache status and API usage to user
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
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs(searchQuery, location, 0);
  };

  const handleLauncherToggle = async () => {
    if (globalJobSearchState.isOpen && globalJobSearchState.activeInstance !== instanceId) {
      globalJobSearchState.isOpen = false;
      globalJobSearchState.activeInstance = null;
    }

    const newState = !showJobSearch;
    setShowJobSearch(newState);
    globalJobSearchState.isOpen = newState;
    globalJobSearchState.activeInstance = newState ? instanceId : null;

    if (newState && jobs.length === 0) {
      await fetchJobs();
    }
  };

  const handleLauncherKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleLauncherToggle();
    }
  };

  return (
    <>
      {/* Job Search Launcher */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={showJobSearch}
        onClick={handleLauncherToggle}
        onKeyDown={handleLauncherKeyDown}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 188, 212, 0.2)';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 188, 212, 0.4)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 188, 212, 0.1)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 188, 212, 0.2)';
          e.currentTarget.style.transform = 'translateY(0px)';
        }}
        style={{
          background: 'rgba(0, 188, 212, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 188, 212, 0.3)',
          color: '#00bcd4',
          fontWeight: 700,
          textShadow: '0 0 10px rgba(0, 188, 212, 0.5)',
          boxShadow: '0 0 20px rgba(0, 188, 212, 0.2)',
          transition: 'all 0.3s ease',
          minWidth: '220px',
          borderRadius: 18,
          padding: '0.85rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800 }}>
            💼 <TranslatedText>JOB SEARCH</TranslatedText>
          </span>
          <span style={{ fontSize: '0.8rem' }}>↗</span>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
          <TranslatedText>Tap anywhere to open the cAI TechHub job lab.</TranslatedText>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#66f2ff', letterSpacing: '0.08em' }}>
          <TranslatedText>Save favorites • Weekly digest • cAI agent</TranslatedText>
        </div>
      </div>

      {/* JOB SEARCH - BLUE BEAM ANIMATION (EXACT COPY OF AI NEWS BUT LEFT SIDE) */}
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
            onClick={() => {
              setShowJobSearch(false);
              globalJobSearchState.isOpen = false;
              globalJobSearchState.activeInstance = null;
            }}
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
            <div style={{ marginTop: 6 }}>
              <button className="btn" onClick={() => setShowCAI(true)} style={{ padding: "6px 10px", fontSize: "0.85rem" }}>
                🥷 <TranslatedText>cAI TechHub — Weekly Digest</TranslatedText>
              </button>
              <button className="btn" onClick={() => setShowSignIn(true)} style={{ padding: "6px 10px", fontSize: "0.85rem", marginLeft: 8 }}>
                😎 <TranslatedText>Save favorites — Sign in</TranslatedText>
              </button>
            </div>
            {/* Local filters */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <div className="io-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="#66ccff"/></svg>
                <input
                  placeholder="Filter title/company/location..."
                  value={localFilter}
                  onChange={(e) => setLocalFilter(e.target.value)}
                />
                <button className="io-btn"><TranslatedText>Filter</TranslatedText></button>
              </div>
              <div className={`io-switch ${onlySalary ? "on" : ""}`} onClick={() => setOnlySalary(v => !v)}>
                <div className="knob"></div>
              </div>
              <div className="t-sm text-muted"><TranslatedText>Only salary</TranslatedText></div>
              <button className="io-btn" onClick={exportJobsCSV}><TranslatedText>Export</TranslatedText></button>
              {/* Level filter */}
              <div className="io-nav">
                {["", "intern", "entry", "regular", "senior", "advanced"].map((lvl) => (
                  <button
                    key={lvl || "all"}
                    className={`io-pill ${level === lvl ? "active" : ""}`}
                    onClick={() => setLevel(lvl)}
                  >
                    {lvl || "all"}
                  </button>
                ))}
              </div>
              {/* Salary min */}
              <div className="io-search" style={{ width: 140 }}>
                <input
                  type="number"
                  min="0"
                  placeholder="Min salary"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                />
              </div>
              {/* Remote only */}
              <div className={`io-switch ${remoteOnly ? "on" : ""}`} onClick={() => setRemoteOnly(v => !v)}>
                <div className="knob"></div>
              </div>
              <div className="t-sm text-muted"><TranslatedText>Remote only</TranslatedText></div>
            </div>
            {/* Progress bar (jobs per page rough indicator) */}
            <div className="io-progress" style={{ marginTop: 10 }}>
              <div className="bar" style={{ width: `${Math.min(100, (jobs.length / 20) * 100)}%` }}></div>
            </div>
          </motion.div>

          {/* Job Search Form - Compact */}
          <motion.form
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            onSubmit={handleSearch}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(0, 188, 212, 0.3)",
              borderRadius: "15px",
              padding: "15px",
              marginBottom: "15px",
              backdropFilter: "blur(5px)",
            }}
          >
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Job Title or Keywords"
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (Optional)"
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  fontSize: "14px",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #00bcd4, #0097a7)",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <TranslatedText>Searching...</TranslatedText>
              ) : (
                <>🔍 <TranslatedText>Search Jobs</TranslatedText></>
              )}
            </button>
          </motion.form>

          {/* Job Results */}
          {jobs.length > 0 ? (
			<div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {jobs
                .filter((job) => {
                  if (onlySalary) {
                    const hasSalary = job.salary && job.salary !== "Not specified";
                    if (!hasSalary) return false;
                  }
                  if (salaryMin) {
                    const min = parseInt(salaryMin, 10) || 0;
                    const jmin = parseInt(job.salary_min, 10) || 0;
                    const jmax = parseInt(job.salary_max, 10) || 0;
                    const avg = jmin && jmax ? (jmin + jmax) / 2 : jmin || jmax || 0;
                    if (avg < min) return false;
                  }
                  if (remoteOnly) {
                    const t = (job.title || "").toLowerCase();
                    const l = (job.location || "").toLowerCase();
                    if (!(t.includes("remote") || l.includes("remote") || t.includes("hybrid") || l.includes("hybrid"))) {
                      return false;
                    }
                  }
                  if (!localFilter) return true;
                  const f = localFilter.toLowerCase();
                  return (
                    (job.title || "").toLowerCase().includes(f) ||
                    (job.company || "").toLowerCase().includes(f) ||
                    (job.location || "").toLowerCase().includes(f)
                  );
                })
                .map((job, index) => (
                <motion.div
                  key={job.id || index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="io-model-card"
                  style={{ marginBottom: "1rem" }}
                >
						{/* cAI TechHub trigger per job list */}
						<div className="text-muted" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
							<button className="btn" onClick={() => setShowCAI(true)} style={{ padding: "4px 10px", fontSize: "0.8rem" }}>
								🥷 <TranslatedText>cAI TechHub</TranslatedText>
							</button>
						</div>
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

                  <h4 className="io-model-title" style={{ marginBottom: "0.25rem", fontSize: "1rem", lineHeight: "1.4" }}>
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

                  {job.level && (
                    <div
                      style={{
                        color: "#9b59b6",
                        fontWeight: "600",
                        marginBottom: "0.25rem",
                        fontSize: "0.8rem",
                      }}
                    >
                      🎯 {job.level}
                    </div>
                  )}

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
                    <a href={`/job/${job.id}`} target="_blank" rel="noopener noreferrer" className="io-btn pill">
                      🔗 <TranslatedText>Apply Now</TranslatedText>
                    </a>
                    <button
                      className="io-btn pill"
                      onClick={() => toggleSaveJob(job.id)}
                    >
                      {savedJobIds.has(job.id) ? '⭐ Saved' : '☆ Save'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : loading ? (
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="io-model-card" style={{ marginBottom: "1rem" }}>
                  <div className="io-skeleton" style={{ height: 12, width: 120, marginBottom: 6 }}></div>
                  <div className="io-skeleton" style={{ height: 14, width: "80%", marginBottom: 8 }}></div>
                  <div className="io-skeleton" style={{ height: 12, width: "60%", marginBottom: 8 }}></div>
                  <div className="io-skeleton" style={{ height: 28, width: 120, borderRadius: 999 }}></div>
                </div>
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
              <TranslatedText>No jobs found. Try different keywords.</TranslatedText>
            </div>
          )}

          {/* Pagination */}
          {jobs.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <button
                className="io-btn"
                disabled={currentPage <= 0 || loading}
                onClick={() => fetchJobs(searchQuery, location, Math.max(0, currentPage - 1))}
              >
                ← <TranslatedText>Previous</TranslatedText>
              </button>
              <button
                className="io-btn"
                disabled={loading}
                onClick={() => fetchJobs(searchQuery, location, currentPage + 1)}
              >
                <TranslatedText>Next</TranslatedText> →
              </button>
            </div>
          )}
        </motion.div>
      )}

	{/* cAI Agent Panel */}
	{showCAI && <CAIAgentPanel onClose={() => setShowCAI(false)} />}

  {/* Sign-In Modal */}
  {showSignIn && (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000000
      }}
      onClick={() => setShowSignIn(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: "92vw",
          background: "rgba(20,20,20,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: 18,
          color: "#fff",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 8, fontSize: "1.2rem" }}>
          🤝 Welcome! <span style={{ color: "#66ccff" }}>Let’s save your dream jobs.</span>
        </div>
        <div style={{ color: "#bbb", marginBottom: 12 }}>
          We’ll keep it professional—with jokes. Sign in with Google to save favorites and revisit them faster than a senior dev finds a semicolon bug.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="io-btn" onClick={beginGoogleSignIn}>Continue with Google</button>
          <button className="io-btn ghost" onClick={() => setShowSignIn(false)}>Maybe later</button>
        </div>
      </div>
    </div>
  )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes blueBeam {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

export default JobSearchButton;