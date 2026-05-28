import { useState } from "react";
import TranslatedText from "./TranslatedText";
import API_BASE from "../config/api";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const QUESTIONS = [
	{ key: "role", label: "Preferred role focus", options: ["Software Engineering","AI/ML","Data","Cloud/DevOps","Security","Product","Design","Other"] },
	{ key: "level", label: "Seniority level", options: ["Intern","Junior","Mid","Senior","Staff","Principal"] },
	{ key: "type", label: "Job type", options: ["Full-time","Contract","Part-time","Remote-only","Hybrid"] },
	{ key: "company", label: "Company preference", options: ["Startup","Scale-up","Enterprise","FAANG+","Any"] },
	{ key: "salary", label: "Salary band (USD)", options: ["<80k","80-120k","120-160k","160-220k",">220k"] },
	{ key: "location", label: "Location preference", options: ["US","EU","Remote Global","APAC","LATAM"] },
	{ key: "tech", label: "Tech stack interest", options: ["Python","JavaScript/TypeScript","Go","Java","C++","Rust"] },
	{ key: "industries", label: "Industries", options: ["AI","Fintech","Crypto/Web3","Robotics","Healthcare","Defense"] },
];

export default function CAIAgentPanel({ onClose }) {
	const [email, setEmail] = useState("");
	const [day, setDay] = useState("Monday");
	const [answers, setAnswers] = useState({});
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState(null);

	const toggleAnswer = (key, value) => {
		setAnswers(prev => {
			const curr = prev[key] || [];
			const exists = curr.includes(value);
			const next = exists ? curr.filter(v => v !== value) : [...curr, value];
			return { ...prev, [key]: next };
		});
	};

	const handleSave = async () => {
		setSaving(true);
		setError(null);
		try {
			const res = await fetch(`${API_BASE}/api/cai-agent/subscribe`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					dayOfWeek: day,
					preferences: answers
				})
			});
			const data = await res.json();
			if (!data.success) throw new Error(data.error || "Failed to save");
			setSaved(true);
		} catch (e) {
			setError(e.message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: "rgba(0,0,0,0.6)",
				zIndex: 10000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center"
			}}
		>
			<div className="card" style={{ width: "min(92vw, 900px)", borderRadius: 16, padding: 24, position: "relative" }}>
				<button
					onClick={onClose}
					style={{
						position: "absolute",
						top: 12,
						right: 12,
						background: "rgba(255,255,255,0.12)",
						border: "1px solid rgba(255,255,255,0.2)",
						borderRadius: "50%",
						width: 36, height: 36, color: "#fff", cursor: "pointer"
					}}
				>
					×
				</button>

				<div className="heading" style={{ marginBottom: 4 }}>
					🥷 <TranslatedText>cAI TechHub — Weekly Job & Tech Digest</TranslatedText>
				</div>
				<div className="text-muted" style={{ marginBottom: 16 }}>
					<TranslatedText>Pick a day. Tell cAI what you like. Get the top 20 jobs and curated tech picks weekly.</TranslatedText>
				</div>

				<div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
					<div className="card" style={{ padding: 16 }}>
						<div className="subheading" style={{ marginBottom: 8 }}><TranslatedText>Your schedule</TranslatedText></div>
						<label className="text-muted" style={{ display: "block", marginBottom: 6 }}><TranslatedText>Email</TranslatedText></label>
						<input
							type="email"
							value={email}
							onChange={e => setEmail(e.target.value)}
							placeholder="you@domain.com"
							style={{
								width: "100%", padding: "10px 12px", borderRadius: 8,
								border: "1px solid var(--border)", background: "var(--background-elev)", color: "#fff", marginBottom: 12
							}}
						/>
						<label className="text-muted" style={{ display: "block", marginBottom: 6 }}><TranslatedText>Delivery day</TranslatedText></label>
						<select
							value={day}
							onChange={e => setDay(e.target.value)}
							style={{
								width: "100%", padding: "10px 12px", borderRadius: 8,
								border: "1px solid var(--border)", background: "var(--background-elev)", color: "#fff"
							}}
						>
							{DAYS.map(d => <option key={d} value={d}>{d}</option>)}
						</select>
					</div>

					<div className="card" style={{ padding: 16 }}>
						<div className="subheading" style={{ marginBottom: 8 }}><TranslatedText>Your preferences</TranslatedText></div>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
							{QUESTIONS.map(q => (
								<div key={q.key} className="card" style={{ padding: 10 }}>
									<div className="text-muted" style={{ marginBottom: 8 }}>{q.label}</div>
									<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
										{q.options.map(opt => {
											const active = (answers[q.key] || []).includes(opt);
											return (
												<button
													key={opt}
													type="button"
													onClick={() => toggleAnswer(q.key, opt)}
													className="btn"
													style={{
														padding: "6px 10px",
														borderRadius: 999,
														borderColor: active ? "var(--accent)" : "rgba(255,255,255,0.15)",
														background: active ? "rgba(102,204,255,0.18)" : "rgba(255,255,255,0.06)"
													}}
												>
													{opt}
												</button>
											);
										})}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{error && <div style={{ color: "#ff6b6b", marginTop: 10 }}>{error}</div>}
				{saved && <div style={{ color: "#00e5ff", marginTop: 10 }}><TranslatedText>Saved! cAI will email you weekly.</TranslatedText></div>}

				<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: 16 }}>
					<button className="btn" onClick={onClose}><TranslatedText>Close</TranslatedText></button>
					<button className="btn btn-primary" disabled={saving || !email} onClick={handleSave}>
						{saving ? <TranslatedText>Saving...</TranslatedText> : <TranslatedText>Save preferences</TranslatedText>}
					</button>
				</div>
			</div>
		</div>
	);
}


