import { useEffect, useMemo, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { invalidateProfileQueries } from '../api/queries';
import { COMMON_BRANCHES, DEGREE_TYPES, STUDENT_YEARS_OF_STUDY } from '../lib/constants';
import SkillTagInput from '../components/SkillTagInput';
import './CareerProfileSection.css';

const MAX_PROJECTS = 10;
const emptyProject = () => ({ title: '', techStack: [], description: '' });

const toForm = (p = {}) => ({
  skills: p.skills || [],
  degreeType: p.degreeType || '',
  branch: p.branch || '',
  yearOfStudy: p.yearOfStudy || '',
  graduationYear: p.graduationYear != null ? String(p.graduationYear) : '',
  cgpa: p.cgpa != null ? String(p.cgpa) : '',
  activeBacklogs: p.activeBacklogs != null ? String(p.activeBacklogs) : '',
  projects: (p.projects || []).map((pr) => ({ title: pr.title || '', techStack: pr.techStack || [], description: pr.description || '' })),
});

const numberOrNull = (v) => (v === '' || v == null ? null : Number(v));

/** Builds a partial PUT /api/profile payload containing only changed career fields. */
export function buildCareerPayload(form, initial) {
  const payload = {};
  const changed = (key) => JSON.stringify(form[key]) !== JSON.stringify(initial[key]);
  if (changed('skills')) payload.skills = form.skills;
  for (const key of ['degreeType', 'branch', 'yearOfStudy']) if (changed(key)) payload[key] = form[key];
  for (const key of ['graduationYear', 'cgpa', 'activeBacklogs']) if (changed(key)) payload[key] = numberOrNull(form[key]);
  if (changed('projects')) {
    payload.projects = form.projects
      .filter((p) => p.title.trim())
      .map((p) => ({ title: p.title.trim(), techStack: p.techStack, description: p.description.trim() }));
  }
  return payload;
}

/** Client-side checks mirroring the API rules; returns a message or ''. */
export function validateCareerForm(form) {
  if (form.cgpa !== '' && (Number.isNaN(Number(form.cgpa)) || Number(form.cgpa) < 0 || Number(form.cgpa) > 10)) return 'CGPA must be between 0 and 10.';
  if (form.activeBacklogs !== '' && (!Number.isInteger(Number(form.activeBacklogs)) || Number(form.activeBacklogs) < 0)) return 'Active backlogs must be a whole number (0 or more).';
  if (form.graduationYear !== '' && (!Number.isInteger(Number(form.graduationYear)) || Number(form.graduationYear) < 2000 || Number(form.graduationYear) > 2100)) {
    return 'Graduation year must be between 2000 and 2100.';
  }
  if (form.projects.some((p) => !p.title.trim() && (p.description.trim() || p.techStack.length))) return 'Each project needs a title.';
  return '';
}

/**
 * Skills, education and projects used by the career assistant for matching.
 * All fields are optional — anything left empty is treated as "unknown", never as a gap.
 */
export default function CareerProfileSection({ profileData, userId }) {
  const initial = useMemo(() => toForm(profileData), [profileData]);
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState({ loading: false, success: false, error: '' });

  useEffect(() => setForm(initial), [initial]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setProject = (idx, key, value) =>
    setForm((f) => ({ ...f, projects: f.projects.map((p, i) => (i === idx ? { ...p, [key]: value } : p)) }));

  const payload = buildCareerPayload(form, initial);
  const isDirty = Object.keys(payload).length > 0;

  const handleSave = async (e) => {
    e.preventDefault();
    const problem = validateCareerForm(form);
    if (problem) {
      setStatus({ loading: false, success: false, error: problem });
      return;
    }
    setStatus({ loading: true, success: false, error: '' });
    try {
      const res = await axiosInstance.put('/api/profile', payload);
      setForm(toForm(res.data));
      invalidateProfileQueries(userId);
      setStatus({ loading: false, success: true, error: '' });
      setTimeout(() => setStatus((s) => ({ ...s, success: false })), 3000);
    } catch (err) {
      setStatus({ loading: false, success: false, error: err.response?.data?.message || 'Failed to save skills and education.' });
    }
  };

  return (
    <section className="settings-section" id="section-career-profile">
      <div className="settings-section__header">
        <h2 className="settings-section__title">Skills, education & projects</h2>
        <p className="settings-section__desc">
          Used by the assistant to match you with openings and check eligibility. Everything is optional — missing details are shown as “unknown”, never counted against you.
        </p>
      </div>

      <form onSubmit={handleSave} className="claude-rows-container">
        <div className="claude-row claude-row--stacked">
          <div className="claude-row__info">
            <label htmlFor="career-skills" className="claude-row__label">Skills</label>
            <p className="claude-row__desc">Technologies and abilities you can demonstrate, e.g. React, SQL, Python.</p>
          </div>
          <SkillTagInput id="career-skills" value={form.skills} onChange={(v) => set('skills', v)} ariaLabel="Add a skill" />
        </div>

        <div className="claude-row claude-row--stacked">
          <div className="claude-row__info">
            <span className="claude-row__label">Education</span>
            <p className="claude-row__desc">Compared with each opening’s eligibility rules.</p>
          </div>
          <div className="career-grid">
            <label className="career-field">
              <span className="sub-label">Degree</span>
              <select className="form-input" value={form.degreeType} onChange={(e) => set('degreeType', e.target.value)}>
                <option value="">Not specified</option>
                {DEGREE_TYPES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="career-field">
              <span className="sub-label">Branch</span>
              <input
                className="form-input"
                list="career-branch-options"
                value={form.branch}
                maxLength={50}
                placeholder="e.g. CSE"
                onChange={(e) => set('branch', e.target.value)}
              />
              <datalist id="career-branch-options">
                {COMMON_BRANCHES.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </label>
            <label className="career-field">
              <span className="sub-label">Current year</span>
              <select className="form-input" value={form.yearOfStudy} onChange={(e) => set('yearOfStudy', e.target.value)}>
                <option value="">Not specified</option>
                {STUDENT_YEARS_OF_STUDY.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="career-field">
              <span className="sub-label">Graduation year</span>
              <input className="form-input" type="number" min="2000" max="2100" placeholder="e.g. 2027" value={form.graduationYear} onChange={(e) => set('graduationYear', e.target.value)} />
            </label>
            <label className="career-field">
              <span className="sub-label">CGPA (0–10)</span>
              <input className="form-input" type="number" min="0" max="10" step="0.01" placeholder="e.g. 8.2" value={form.cgpa} onChange={(e) => set('cgpa', e.target.value)} />
            </label>
            <label className="career-field">
              <span className="sub-label">Active backlogs</span>
              <input className="form-input" type="number" min="0" placeholder="e.g. 0" value={form.activeBacklogs} onChange={(e) => set('activeBacklogs', e.target.value)} />
            </label>
          </div>
        </div>

        <div className="claude-row claude-row--stacked">
          <div className="claude-row__info">
            <span className="claude-row__label">Projects</span>
            <p className="claude-row__desc">Projects show skills in practice — the tech stack counts as demonstrated skills.</p>
          </div>
          <div className="career-projects">
            {form.projects.length === 0 && <p className="career-empty">No projects added yet.</p>}
            {form.projects.map((p, idx) => (
              <fieldset key={idx} className="career-project">
                <legend className="visually-hidden">Project {idx + 1}</legend>
                <div className="career-project__head">
                  <input
                    className="form-input"
                    placeholder="Project title"
                    maxLength={100}
                    value={p.title}
                    aria-label={`Project ${idx + 1} title`}
                    onChange={(e) => setProject(idx, 'title', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-danger-link btn-sm"
                    onClick={() => set('projects', form.projects.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
                <SkillTagInput
                  value={p.techStack}
                  maxItems={15}
                  placeholder="Tech stack, e.g. React, Node.js"
                  ariaLabel={`Project ${idx + 1} tech stack`}
                  onChange={(v) => setProject(idx, 'techStack', v)}
                />
                <textarea
                  className="form-textarea"
                  rows={2}
                  maxLength={1000}
                  placeholder="What it does and your role (optional)"
                  aria-label={`Project ${idx + 1} description`}
                  value={p.description}
                  onChange={(e) => setProject(idx, 'description', e.target.value)}
                />
              </fieldset>
            ))}
            {form.projects.length < MAX_PROJECTS && (
              <button type="button" className="btn-secondary btn-sm career-add" onClick={() => set('projects', [...form.projects, emptyProject()])}>
                + Add project
              </button>
            )}
          </div>
        </div>

        <div className="settings-section__footer">
          <button type="submit" className="btn-primary" disabled={!isDirty || status.loading}>
            {status.loading ? 'Saving...' : 'Save changes'}
          </button>
          {status.success && <span className="status-badge status-badge--success">Saved ✓</span>}
          {status.error && <span className="status-badge status-badge--error">{status.error}</span>}
        </div>
      </form>
    </section>
  );
}
