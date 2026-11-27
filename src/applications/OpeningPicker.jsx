import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDeadlineDate } from '../openings/StudentOpeningCard';

const MAX_RESULTS = 8;

/** Case-insensitive match on company, role, location, type and listed skills. */
export function filterOpenings(openings = [], query = '') {
  const q = query.trim().toLowerCase();
  if (!q) return openings;
  return openings.filter((o) =>
    [o.companyName, o.jobRole, o.location, o.jobType, o.workMode, ...(o.requiredSkills || [])]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  );
}

/** Application fields auto-filled from a HireTrack opening (the opening stays the source of truth via placementOpeningId). */
export function fieldsFromOpening(opening) {
  return {
    companyName: opening.companyName || '',
    jobRole: opening.jobRole || '',
    ...(opening.jobType ? { jobType: opening.jobType } : {}),
    jobUrl: opening.applicationLink || '',
    jobDescription: opening.description || '',
    placementOpeningId: opening.id,
  };
}

/**
 * Search and pick an open HireTrack opening for a new application.
 * Openings the student already has an application for are shown but cannot be picked.
 */
export default function OpeningPicker({ openings, isLoading, isError, appliedByOpening, selected, onSelect, onClear }) {
  const [query, setQuery] = useState('');

  if (selected) {
    const meta = [selected.jobType, selected.workMode, selected.location].filter(Boolean).join(' · ');
    return (
      <div className="opening-picker__selected" role="status">
        <div>
          <span className="opening-picker__eyebrow">Linked HireTrack opening</span>
          <div className="opening-picker__title">
            {selected.companyName} — {selected.jobRole}
          </div>
          <div className="opening-picker__meta">
            {[meta, formatDeadlineDate(selected.deadline)].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={onClear}>
          Change
        </button>
      </div>
    );
  }

  const results = filterOpenings(openings, query);
  const shown = results.slice(0, MAX_RESULTS);

  return (
    <div className="opening-picker">
      <input
        type="search"
        className="opening-picker__search"
        placeholder="Search openings by company, role, location or skill…"
        aria-label="Search HireTrack openings"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {isLoading ? (
        <p className="opening-picker__empty">Loading openings…</p>
      ) : isError ? (
        <p className="opening-picker__empty">Couldn’t load openings. Try again, or add an external application.</p>
      ) : shown.length === 0 ? (
        <p className="opening-picker__empty">
          {openings?.length ? 'No open openings match your search.' : 'There are no open HireTrack openings right now.'} You can add an external application instead.
        </p>
      ) : (
        <ul className="opening-picker__list" aria-label="HireTrack openings">
          {shown.map((o) => {
            const appliedId = appliedByOpening.get(o.id);
            return (
              <li key={o.id}>
                <button
                  type="button"
                  className="opening-picker__option"
                  disabled={Boolean(appliedId)}
                  onClick={() => onSelect(o)}
                >
                  <span className="opening-picker__title">
                    {o.companyName} — {o.jobRole}
                  </span>
                  <span className="opening-picker__meta">
                    {[o.jobType, o.workMode, o.location, formatDeadlineDate(o.deadline)].filter(Boolean).join(' · ')}
                  </span>
                  {(appliedId || o.isTracked) && (
                    <span className={`opening-picker__tag ${appliedId ? 'opening-picker__tag--applied' : ''}`}>
                      {appliedId ? 'Already applied' : 'Tracked'}
                    </span>
                  )}
                </button>
                {appliedId && (
                  <Link className="opening-picker__view" to={`/applications/${appliedId}`}>
                    View application
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {results.length > MAX_RESULTS && (
        <p className="opening-picker__empty">Showing {MAX_RESULTS} of {results.length} — refine your search.</p>
      )}
    </div>
  );
}
