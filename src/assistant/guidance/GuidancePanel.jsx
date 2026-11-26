import { Link } from 'react-router-dom';
import OpeningCard from './OpeningCard';
import ReadinessPanel from './ReadinessPanel';
import ComparisonView from './ComparisonView';
import LearningPlan from './LearningPlan';
import { formatMissing, pickAssessments } from './guidanceLabels';
import './guidance.css';

const MAX_COMPARE = 3;

/**
 * Structured guidance shown under an assistant reply. Content depends on the intent:
 *  - DISCOVER: opening cards (with compare selection)
 *  - READINESS / UPSKILL: readiness checklist for the openings in focus (+ learning plan)
 *  - COMPARE: side-by-side table
 * Everything rendered here is verified HireTrack data; the prose above is the AI's explanation.
 */
export default function GuidancePanel({
  guidance,
  onAction,
  onAsk,
  compareSelection = [],
  onToggleCompare,
  disabled = false,
  isLatest = true,
  isStreaming = false,
}) {
  if (!guidance) return null;
  const { intent, openings = [], focusIds = [], learningPlan = [], suggestedQuestions = [], notices = [], profile } = guidance;

  // While the answer streams, show a one-line summary instead of the full panel so the
  // growing text above does not keep pushing cards down; the panel appears when it completes.
  if (isStreaming && !guidance.complete) {
    const names = openings.map((a) => a.opening.companyName);
    return (
      <p className="gd-pending" role="status">
        {names.length
          ? `Checking ${names.length === 1 ? names[0] : `${names.length} openings (${names.join(', ')})`} against your profile…`
          : 'Reviewing your HireTrack data…'}
      </p>
    );
  }
  const focus = pickAssessments(guidance, focusIds);
  const openingsById = new Map(openings.map((a) => [a.opening.id, a]));
  const selectedIds = new Set(compareSelection.map((o) => o.id));
  const canSelectMore = compareSelection.length < MAX_COMPARE;

  const showReadiness = (intent === 'READINESS' || intent === 'UPSKILL') && focus.length > 0;
  const showCompare = intent === 'COMPARE' && focus.length >= 2;
  const cards = showReadiness || showCompare ? openings.filter((a) => !focusIds.includes(a.opening.id)) : openings;
  const missing = profile?.missing || [];
  const importantMissing = missing.filter((m) => m !== 'resume' && m !== 'projects');

  return (
    <div className="gd-panel">
      {notices.length > 0 && (
        <ul className="gd-notices" role="status">
          {notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {showCompare && <ComparisonView assessments={focus} />}

      {showReadiness && focus.map((a) => <ReadinessPanel key={a.opening.id} assessment={a} />)}

      <LearningPlan items={learningPlan} openingsById={openingsById} />

      {cards.length > 0 && (
        <div className="gd-cards">
          {(showReadiness || showCompare) && <div className="gd-block__title">Also discussed</div>}
          {cards.map((a) => (
            <OpeningCard
              key={a.opening.id}
              assessment={a}
              onAction={onAction}
              disabled={disabled}
              isSelected={selectedIds.has(a.opening.id)}
              canSelectMore={canSelectMore}
              onToggleCompare={onToggleCompare}
            />
          ))}
        </div>
      )}

      {isLatest && importantMissing.length > 0 && (
        <p className="gd-note">
          Matching is more precise with your {formatMissing(importantMissing)}.{' '}
          <Link to="/settings?tab=job-search">Complete your profile</Link>
        </p>
      )}

      {isLatest && guidance.complete && suggestedQuestions.length > 0 && (
        <div className="gd-followups" role="group" aria-label="Suggested follow-up questions">
          {suggestedQuestions.slice(0, 3).map((q) => (
            <button key={q} type="button" className="gd-chip" disabled={disabled} onClick={() => onAsk(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
