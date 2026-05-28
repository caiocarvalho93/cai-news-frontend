import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import TranslatedText from "../components/TranslatedText";

export default function Job() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [job, setJob] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchJob = async () => {
			try {
				const res = await fetch(`${API_BASE}/api/jobs/${encodeURIComponent(id)}`);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				if (!data?.job) throw new Error("Job not found");
				setJob(data.job);
			} catch (e) {
				setError(e.message || "Failed to load job");
			} finally {
				setLoading(false);
			}
		};
		fetchJob();
	}, [id]);

	const handleApply = async () => {
		try {
			await fetch(`${API_BASE}/api/jobs/track-click`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ jobId: id }),
			});
		} catch {
			// non-blocking
		}
		if (job?.url) {
			window.open(job.url, "_blank", "noopener,noreferrer");
		}
	};

	if (loading) {
		return (
			<div className="container">
				<div className="loading">
					<TranslatedText>Loading job...</TranslatedText>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container">
				<div className="card" style={{ padding: "1rem" }}>
					<div style={{ color: "#ff6b6b", marginBottom: "0.5rem" }}>
						<TranslatedText>Error</TranslatedText>: {error}
					</div>
					<button className="btn" onClick={() => navigate(-1)}>
						← <TranslatedText>Back</TranslatedText>
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="container">
			<div className="flex-between" style={{ marginBottom: "1.5rem" }}>
				<div>
					<div className="heading" style={{ marginBottom: "0.25rem" }}>
						{job?.title || <TranslatedText>Job</TranslatedText>}
					</div>
					<div className="text-muted">
						{job?.company && <>🏢 {job.company} • </>}
						{job?.location && <>📍 {job.location}</>}
					</div>
				</div>
				<div className="flex" style={{ gap: "0.5rem" }}>
					<button className="btn" onClick={() => navigate(-1)}>
						← <TranslatedText>Back</TranslatedText>
					</button>
					<button className="btn btn-primary" onClick={handleApply}>
						🔗 <TranslatedText>Apply Now</TranslatedText>
					</button>
				</div>
			</div>

			<div className="card" style={{ marginBottom: "1rem" }}>
				<div className="subheading" style={{ marginBottom: "0.5rem" }}>
					<TranslatedText>Job Details</TranslatedText>
				</div>
				{job?.salary_display && (
					<div style={{ color: "#4caf50", fontWeight: 600, marginBottom: "0.5rem" }}>
						💰 {job.salary_display}
					</div>
				)}
				{job?.description && (
					<div className="text-secondary" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
						{job.description}
					</div>
				)}
			</div>

			<div className="card">
				<div className="subheading" style={{ marginBottom: "0.5rem" }}>
					<TranslatedText>Original Posting</TranslatedText>
				</div>
				{job?.url ? (
					<a href={job.url} target="_blank" rel="noopener noreferrer" className="btn" onClick={handleApply}>
						🔗 <TranslatedText>Open Employer Site</TranslatedText>
					</a>
				) : (
					<div className="text-muted">
						<TranslatedText>Link unavailable</TranslatedText>
					</div>
				)}
			</div>
		</div>
	);
}


