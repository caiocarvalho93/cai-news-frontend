import { useEffect, useMemo, useState, useCallback } from "react";
import TranslatedText from "../components/TranslatedText";
import { apiCall, createApiUrl } from "../config/api";
import { GAME_COUNTRIES } from "../config/gameCountries";

/**
 * 🏟️ AI NEWS ARENA
 *
 * A real, gamified competition: submit an AI / tech / startup article URL,
 * pick your country, and put it on the global leaderboard. Every number on
 * this page is read live from the backend (PostgreSQL-backed game engine) —
 * when the backend is in degraded mode the UI says so honestly instead of
 * inventing scores.
 */

const REFRESH_MS = 30000;

// Build region-grouped, name-sorted <optgroup> options once.
function useCountryOptions() {
  return useMemo(() => {
    const byRegion = {};
    for (const [code, info] of Object.entries(GAME_COUNTRIES)) {
      const region = info.region || "Other";
      (byRegion[region] ||= []).push([code, info]);
    }
    return Object.keys(byRegion)
      .sort()
      .map((region) => ({
        region,
        countries: byRegion[region].sort((a, b) => a[1].name.localeCompare(b[1].name)),
      }));
  }, []);
}

function countryLabel(code) {
  const info = GAME_COUNTRIES[code];
  if (!info) return code;
  return `${info.flag} ${info.name}`;
}

function rankBadge(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function fmt(n) {
  return Number(n || 0).toLocaleString();
}

function looksLikeUrl(value) {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Rarity → palette. Drives the glow/border on every badge so legendary unlocks
// feel earned. Unknown rarities fall back to "common" (never crashes the UI).
const RARITY = {
  common: { color: "#9fb3c8", glow: "rgba(159,179,200,0.25)", label: "Common" },
  rare: { color: "#66ccff", glow: "rgba(102,204,255,0.30)", label: "Rare" },
  epic: { color: "#c084fc", glow: "rgba(192,132,252,0.30)", label: "Epic" },
  legendary: { color: "#ffd54a", glow: "rgba(255,213,74,0.38)", label: "Legendary" },
};
function rarityStyle(r) {
  return RARITY[String(r || "common").toLowerCase()] || RARITY.common;
}

// Human "how to unlock" line derived from the catalog thresholds (real numbers
// straight from the backend — no invented requirements).
function requirementText(a) {
  const parts = [];
  if (a.submissionsRequired > 0) parts.push(`${a.submissionsRequired} submission${a.submissionsRequired > 1 ? "s" : ""}`);
  if (a.pointsRequired > 0) parts.push(`${a.pointsRequired} points`);
  return parts.length ? `Requires ${parts.join(" · ")}` : "Open to everyone";
}

// Defensive: the unlock payload is objects ({name, icon, rarity, …}); tolerate a
// bare string too so a stale backend can never crash the celebration.
function normalizeAchievement(a) {
  if (a && typeof a === "object") return a;
  return { name: String(a), icon: "🏅", rarity: "common", description: null };
}

function readAuthToken() {
  try {
    return localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

// One submission row — shared by the global "Latest submissions" feed and the
// per-country drill-down so both stay visually identical and DRY.
function SubmissionRow({ item }) {
  return (
    <div
      className="io-space-between"
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--io-border, rgba(255,255,255,0.08))" }}
    >
      <div style={{ minWidth: 0 }}>
        <a
          className="io-link"
          href={item.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {countryLabel(item.country)} — {item.title || item.source || item.url}
        </a>
        {item.source && <span className="text-muted" style={{ fontSize: 12 }}>{item.source}</span>}
      </div>
      <span className="io-tag" style={{ flex: "0 0 auto" }}>+{fmt(item.points)}</span>
    </div>
  );
}

export default function Arena() {
  const countryOptions = useCountryOptions();

  const [stats, setStats] = useState(null);
  const [statsDegraded, setStatsDegraded] = useState(false);

  const [leaderboard, setLeaderboard] = useState([]);
  const [lbDegraded, setLbDegraded] = useState(false);
  const [lbLoaded, setLbLoaded] = useState(false);

  const [feed, setFeed] = useState([]);

  const [url, setUrl] = useState("");
  const [country, setCountry] = useState("US");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok, text, points, achievements }

  // Badge gallery (catalog + this member's unlocked state).
  const [achievements, setAchievements] = useState([]);
  const [achLoaded, setAchLoaded] = useState(false);
  const [achAuthed, setAchAuthed] = useState(false);
  const [achUnlocked, setAchUnlocked] = useState(0);

  // Per-country drill-down: { country, loading, submissions }.
  const [drill, setDrill] = useState(null);

  const urlValid = useMemo(() => looksLikeUrl(url), [url]);

  const loadBoard = useCallback(async () => {
    try {
      const [statsRes, lbRes, feedRes] = await Promise.allSettled([
        apiCall("/api/arena/stats"),
        apiCall("/api/arena/leaderboard?limit=100"),
        apiCall("/api/arena/feed?limit=12"),
      ]);

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value?.stats || null);
        setStatsDegraded(!!statsRes.value?.degraded);
      }
      if (lbRes.status === "fulfilled") {
        setLeaderboard(Array.isArray(lbRes.value?.leaderboard) ? lbRes.value.leaderboard : []);
        setLbDegraded(!!lbRes.value?.degraded);
      }
      if (feedRes.status === "fulfilled") {
        setFeed(Array.isArray(feedRes.value?.submissions) ? feedRes.value.submissions : []);
      }
    } catch {
      // apiCall already logs; leave last-good state in place.
    } finally {
      setLbLoaded(true);
    }
  }, []);

  // Achievements reflect the signed-in member's unlocked state, so this needs
  // the bearer token (apiCall doesn't attach it). Anonymous callers still get
  // the full catalog, just all-locked — an honest nudge to sign in. Loaded on
  // mount + after a successful submit (not on the 30s tick: badges only change
  // when you submit, so polling them would be wasteful).
  const loadAchievements = useCallback(async () => {
    try {
      const token = readAuthToken();
      const res = await fetch(createApiUrl("/api/arena/achievements"), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success) {
        setAchievements(Array.isArray(data.achievements) ? data.achievements : []);
        setAchAuthed(!!data.authenticated);
        setAchUnlocked(Number(data.unlockedCount) || 0);
      }
    } catch {
      // leave last-good badge state in place
    } finally {
      setAchLoaded(true);
    }
  }, []);

  // Drill into one country's recent submissions. Reuses the public, display-safe
  // /feed?country= endpoint — no new backend needed.
  const openDrill = useCallback(async (cc) => {
    setDrill({ country: cc, loading: true, submissions: [] });
    try {
      const data = await apiCall(`/api/arena/feed?country=${encodeURIComponent(cc)}&limit=15`);
      setDrill({ country: cc, loading: false, submissions: Array.isArray(data?.submissions) ? data.submissions : [] });
    } catch {
      setDrill({ country: cc, loading: false, submissions: [] });
    }
  }, []);

  useEffect(() => {
    loadBoard();
    loadAchievements();
    const id = setInterval(loadBoard, REFRESH_MS);
    return () => clearInterval(id);
  }, [loadBoard, loadAchievements]);

  const submit = async () => {
    if (!urlValid || submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      // Direct fetch (not apiCall) so we can read the JSON body on 4xx/5xx.
      const token = readAuthToken();
      const res = await fetch(createApiUrl("/api/arena/submit"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: url.trim(), country }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setResult({
          ok: true,
          text: data.message || "Submitted!",
          points: data.submission?.points,
          achievements: (data.submission?.achievements || []).map(normalizeAchievement),
        });
        setUrl("");
        loadBoard(); // reflect the new score immediately
        loadAchievements(); // light up any newly-earned badges in the gallery
      } else {
        setResult({
          ok: false,
          text: data?.message || "Submission could not be accepted. Please try a different article.",
        });
      }
    } catch {
      setResult({ ok: false, text: "Network error — please check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const heroStats = [
    { label: "Articles in play", value: stats?.totalSubmissions },
    { label: "Countries competing", value: stats?.activeCountries },
    { label: "Contributors", value: stats?.contributors },
    { label: "Total points", value: stats?.totalPoints },
  ];

  return (
    <div className="container io-container">
      {/* HERO */}
      <div className="io-hero io-scan-wall io-bg-grid" style={{ marginBottom: 16 }}>
        <div className="io-title">🏟️ <TranslatedText>AI News Arena</TranslatedText></div>
        <div className="io-subtitle">
          <TranslatedText>
            Drop a real AI, tech or startup story, pick your country, and race it up the global leaderboard.
          </TranslatedText>
        </div>

        <div
          className="io-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 16 }}
        >
          {heroStats.map((s) => (
            <div key={s.label} className="io-card" style={{ padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#66ccff" }}>
                {stats ? fmt(s.value) : "—"}
              </div>
              <div className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
                <TranslatedText>{s.label}</TranslatedText>
              </div>
            </div>
          ))}
        </div>
        {statsDegraded && (
          <div className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>
            <TranslatedText>The Arena is warming up — live totals appear once the game server is connected.</TranslatedText>
          </div>
        )}
      </div>

      {/* SUBMIT */}
      <div className="io-card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="io-title" style={{ fontSize: 18, marginBottom: 10 }}>
          🚀 <TranslatedText>Submit an article for your country</TranslatedText>
        </div>

        <div className="io-row" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="io-input"
            style={{ flex: "2 1 320px" }}
            placeholder="https://techcrunch.com/…  or an AI lab / tech company link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            inputMode="url"
            aria-label="Article URL"
          />
          <select
            className="io-select"
            style={{ flex: "1 1 180px" }}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            aria-label="Country"
          >
            {countryOptions.map(({ region, countries }) => (
              <optgroup key={region} label={region}>
                {countries.map(([code, info]) => (
                  <option key={code} value={code}>{info.flag} {info.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            className="io-btn primary"
            onClick={submit}
            disabled={!urlValid || submitting}
            style={{ flex: "0 0 auto", opacity: !urlValid || submitting ? 0.6 : 1 }}
          >
            {submitting ? <TranslatedText>Submitting…</TranslatedText> : <TranslatedText>Submit</TranslatedText>}
          </button>
        </div>

        <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
          <TranslatedText>
            Only AI / tech / startup articles count. Premium sources (TechCrunch, Wired, official AI labs) earn bonus points.
          </TranslatedText>
        </div>

        {result && (
          <div className={`io-alert ${result.ok ? "success" : "warn"}`} style={{ marginTop: 12 }}>
            <div className="io-alert-body">
              <div className="io-alert-title">{result.ok ? "✅" : "⚠️"} {result.text}</div>
              {result.ok && result.achievements?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                    🎉 <TranslatedText>Achievement unlocked!</TranslatedText>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {result.achievements.map((a) => {
                      const rs = rarityStyle(a.rarity);
                      return (
                        <span
                          key={a.name}
                          className="io-tag"
                          title={a.description || ""}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            border: `1px solid ${rs.color}`,
                            boxShadow: `0 0 12px ${rs.glow}`,
                            color: rs.color,
                            fontWeight: 800,
                          }}
                        >
                          <span style={{ fontSize: 15 }}>{a.icon || "🏅"}</span>
                          {a.name}
                          <span style={{ fontSize: 10, opacity: 0.85, textTransform: "uppercase", letterSpacing: 0.4 }}>
                            {rs.label}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* LEADERBOARD */}
      <div className="io-card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="io-space-between" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="io-title" style={{ fontSize: 18 }}>
            🌍 <TranslatedText>Global Leaderboard</TranslatedText>
          </div>
          <span className="io-tag"><TranslatedText>Live · auto-refresh</TranslatedText></span>
        </div>

        {!lbLoaded ? (
          <div className="io-skeleton" style={{ height: 160 }} />
        ) : lbDegraded ? (
          <div className="io-alert warn">
            <div className="io-alert-body">
              <div className="io-alert-title">⚠️ <TranslatedText>Leaderboard is warming up</TranslatedText></div>
              <TranslatedText>The game server is connecting. Standings will appear here as soon as it's live.</TranslatedText>
            </div>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-secondary" style={{ padding: "12px 4px" }}>
            <TranslatedText>No scores yet — be the first to put your country on the board! 🚀</TranslatedText>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="io-table">
              <thead>
                <tr>
                  <th style={{ width: 64 }}><TranslatedText>Rank</TranslatedText></th>
                  <th><TranslatedText>Country</TranslatedText></th>
                  <th style={{ textAlign: "right" }}><TranslatedText>Score</TranslatedText></th>
                  <th style={{ textAlign: "right" }}><TranslatedText>Articles</TranslatedText></th>
                  <th style={{ textAlign: "right" }}><TranslatedText>Fans</TranslatedText></th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr
                    key={row.country}
                    onClick={() => openDrill(row.country)}
                    title={`View ${countryLabel(row.country)}'s recent submissions`}
                    style={{
                      cursor: "pointer",
                      background: drill?.country === row.country ? "rgba(102,204,255,0.10)" : undefined,
                    }}
                  >
                    <td style={{ fontWeight: 800 }}>{rankBadge(row.rank)}</td>
                    <td>{countryLabel(row.country)}</td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#66ccff" }}>{fmt(row.score)}</td>
                    <td style={{ textAlign: "right" }}>{fmt(row.totalSubmissions)}</td>
                    <td style={{ textAlign: "right" }}>{fmt(row.contributors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>
              <TranslatedText>Tip: tap any country to see its latest submissions.</TranslatedText>
            </div>
          </div>
        )}
      </div>

      {/* COUNTRY DRILL-DOWN */}
      {drill && (
        <div className="io-card" style={{ padding: 16, marginBottom: 16 }}>
          <div className="io-space-between" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="io-title" style={{ fontSize: 16 }}>
              {countryLabel(drill.country)} — <TranslatedText>recent submissions</TranslatedText>
            </div>
            <button className="io-btn" onClick={() => setDrill(null)}>
              <TranslatedText>Close</TranslatedText>
            </button>
          </div>
          {drill.loading ? (
            <div className="io-skeleton" style={{ height: 120 }} />
          ) : drill.submissions.length === 0 ? (
            <div className="text-secondary" style={{ padding: "8px 4px" }}>
              <TranslatedText>No submissions yet for this country — be the first to put it on the board! 🚀</TranslatedText>
            </div>
          ) : (
            <div className="io-stack" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {drill.submissions.map((item, i) => (
                <SubmissionRow key={`${item.url}-${i}`} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACHIEVEMENTS / BADGES */}
      {achLoaded && achievements.length > 0 && (
        <div className="io-card" style={{ padding: 16, marginBottom: 16 }}>
          <div className="io-space-between" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="io-title" style={{ fontSize: 18 }}>
              🏅 <TranslatedText>Achievements</TranslatedText>
            </div>
            <span className="io-tag">{fmt(achUnlocked)} / {fmt(achievements.length)}</span>
          </div>

          {!achAuthed && (
            <div className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>
              <TranslatedText>Sign in to start earning badges — every submission you make signed in unlocks these as you climb.</TranslatedText>
            </div>
          )}

          <div
            className="io-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}
          >
            {achievements.map((a) => {
              const rs = rarityStyle(a.rarity);
              const locked = !a.unlocked;
              return (
                <div
                  key={a.name}
                  className="io-card"
                  title={a.description || ""}
                  style={{
                    padding: 12,
                    opacity: locked ? 0.6 : 1,
                    border: `1px solid ${locked ? "var(--io-border, rgba(255,255,255,0.12))" : rs.color}`,
                    boxShadow: locked ? "none" : `0 0 14px ${rs.glow}`,
                    filter: locked ? "grayscale(0.6)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{locked ? "🔒" : a.icon || "🏅"}</span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 13,
                          color: locked ? "inherit" : rs.color,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {a.name}
                      </div>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: rs.color, opacity: 0.85 }}>
                        {rs.label}
                      </div>
                    </div>
                  </div>
                  {a.description && (
                    <div className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>
                      {a.description}
                    </div>
                  )}
                  <div style={{ fontSize: 11, marginTop: 6, color: locked ? undefined : rs.color }} className={locked ? "text-secondary" : ""}>
                    {a.unlocked ? <>✓ <TranslatedText>Unlocked</TranslatedText></> : requirementText(a)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RECENT FEED */}
      {feed.length > 0 && (
        <div className="io-card" style={{ padding: 16, marginBottom: 24 }}>
          <div className="io-title" style={{ fontSize: 18, marginBottom: 12 }}>
            🔥 <TranslatedText>Latest submissions</TranslatedText>
          </div>
          <div className="io-stack" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {feed.map((item, i) => (
              <SubmissionRow key={`${item.url}-${i}`} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
