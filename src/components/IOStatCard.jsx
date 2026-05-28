export default function IOStatCard({ title, value, onClick, active }) {
	return (
		<div
			className={`io-card ${active ? "fx-glow" : ""}`}
			onClick={onClick}
			style={{ cursor: onClick ? "pointer" : "default", padding: "14px" }}
		>
			<div className="subheading">{title}</div>
			<div className="io-badge">{value}</div>
		</div>
	);
}


