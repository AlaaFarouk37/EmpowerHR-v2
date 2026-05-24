export function JourneyStrip({ cards }) {
  return (
    <div className="workspace-journey-strip" style={{ marginBottom: 24 }}>
      {cards.map((card) => (
        <div key={card.label} className="workspace-journey-card">
          <div className="workspace-journey-title">{card.label}</div>
          <div className="workspace-journey-value" style={{ color: card.accent }}>{card.value}</div>
          <div className="workspace-journey-note">{card.note}</div>
        </div>
      ))}
    </div>
  );
}
