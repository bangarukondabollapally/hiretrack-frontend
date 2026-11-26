/** Opening-specific learning plan returned by the assistant (validated server-side). */
export default function LearningPlan({ items, openingsById }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="gd-plan" aria-label="Learning plan">
      <div className="gd-block__title">Learning plan</div>
      <ol className="gd-plan__list">
        {items.map((item, idx) => {
          const forOpenings = (item.openingIds || []).map((id) => openingsById.get(id)?.opening.companyName).filter(Boolean);
          return (
            <li key={`${item.skill}-${idx}`} className="gd-plan__item">
              <div className="gd-plan__skill">
                {item.skill}
                {forOpenings.length > 0 && <span className="gd-muted"> · for {forOpenings.join(', ')}</span>}
              </div>
              <p className="gd-plan__why">{item.why}</p>
              <ol className="gd-plan__steps">
                {item.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {item.projectIdea && (
                <p className="gd-plan__project">
                  <span className="gd-plan__project-label">Project idea:</span> {item.projectIdea}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
