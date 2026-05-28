import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import TranslatedText from "./TranslatedText";
import API_BASE from "../config/api";

export default function TopNav() {
	const [authUser, setAuthUser] = useState(() => {
		try { return JSON.parse(localStorage.getItem('authUser') || 'null'); } catch { return null; }
	});
	const [authToken, setAuthToken] = useState(() => {
		try { return localStorage.getItem('authToken') || ''; } catch { return ''; }
	});
	const [isMember, setIsMember] = useState(false);
	const [query, setQuery] = useState("");
	const navigate = useNavigate();

	useEffect(() => {
		const load = async () => {
			try {
				const token = localStorage.getItem('authToken');
				if (!token) return;
				const r = await fetch(`${API_BASE}/api/community/profile`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
				if (r?.success) setIsMember(!!r.isMember);
			} catch {}
		};
		load();
	}, []);

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

	const joinCommunity = async () => {
		try {
			if (!authToken) {
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
								await fetch(`${API_BASE}/api/community/join`, { method: 'POST', headers: { Authorization: `Bearer ${verify.token}` }});
							}
						} catch {}
					}
				});
				window.google.accounts.id.prompt();
				return;
			}
			await fetch(`${API_BASE}/api/community/join`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` }});
		} catch {}
	};

	const runSearch = () => {
		const term = (query || "").trim();
		if (!term) return;
		// Route into News page with prioritized ("Best News") enabled
		navigate(`/news?q=${encodeURIComponent(term)}&best=1`);
	};

	return (
		<div
			style={{
				position: "sticky",
				top: 0,
				zIndex: 5000,
				backdropFilter: "blur(12px)",
				background: "rgba(10,10,10,0.7)",
				borderBottom: "1px solid var(--border)"
			}}
		>
			<div
				style={{
					maxWidth: 1280,
					margin: "0 auto",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "10px 16px"
				}}
			>
				<div style={{ fontWeight: 900, letterSpacing: 0.5, color: "#66ccff" }}>
					🥷 cAI TechHub
				</div>
				<nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
					<div className="io-search" style={{ marginRight: 12 }}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="#66ccff"/></svg>
						<input
							placeholder="Search hottest news..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									runSearch();
								}
							}}
						/>
						<button className="io-btn" onClick={runSearch}>Go</button>
					</div>
					<NavLink
						to="/"
						className="nav-link"
						style={({ isActive }) => ({
							color: isActive ? "#fff" : "var(--muted-foreground)",
							borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
							padding: "6px 8px",
							textDecoration: "none",
						})}
					>
						<TranslatedText>Command Center</TranslatedText>
					</NavLink>
					<NavLink
						to="/news"
						className="nav-link"
						style={({ isActive }) => ({
							color: isActive ? "#fff" : "var(--muted-foreground)",
							borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
							padding: "6px 8px",
							textDecoration: "none",
						})}
					>
						<TranslatedText>News</TranslatedText>
					</NavLink>
					<NavLink
						to="/ai-leaderboard"
						className="nav-link"
						style={({ isActive }) => ({
							color: isActive ? "#fff" : "var(--muted-foreground)",
							borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
							padding: "6px 8px",
							textDecoration: "none",
						})}
					>
						<TranslatedText>AI Leaderboard</TranslatedText>
					</NavLink>
					{isMember && (
						<NavLink
							to="/community"
							className="nav-link"
							style={({ isActive }) => ({
								color: isActive ? "#fff" : "var(--muted-foreground)",
								borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
								padding: "6px 8px",
								textDecoration: "none",
							})}
						>
							<TranslatedText>My Community</TranslatedText>
						</NavLink>
					)}
					<button className="io-btn primary pill" onClick={joinCommunity}>
						{isMember ? '🥷 Joined' : <TranslatedText>Join cAI</TranslatedText>}
					</button>
				</nav>
			</div>
		</div>
	);
}


