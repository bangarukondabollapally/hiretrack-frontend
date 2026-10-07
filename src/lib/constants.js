/**
 * HireTrack constants — shared application-wide values.
 * Source of truth: docs/API.md § Status/Enum Values
 *
 * Used by: ApplicationsList, StatusControl, ApplicationForm, StatusBadge, and
 * any component that needs to display or filter by status/outcome.
 */

/**
 * Application statuses — ordered to reflect the typical hiring pipeline.
 * Values must match the backend enum exactly (used in API requests/responses).
 */
export const APPLICATION_STATUSES = [
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
];

/**
 * Human-readable labels for each application status.
 * Used for display in badges, dropdowns, and filters.
 */
export const STATUS_LABELS = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

/**
 * Interview outcome values — per docs/API.md.
 * Note: exact set to be confirmed in TASK-018; do not expand until then.
 */
export const INTERVIEW_OUTCOMES = ['PENDING', 'PASSED', 'FAILED', 'CANCELLED'];

/**
 * Human-readable labels for interview outcomes.
 */
export const OUTCOME_LABELS = {
  PENDING: 'Pending',
  PASSED: 'Passed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

/**
 * Routes — centralized path constants for React Router.
 * Avoids hardcoding paths in multiple components.
 */
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  APPLICATIONS: '/applications',
  APPLICATION_DETAIL: '/applications/:id',
  INTERVIEWS: '/interviews',
  ASSISTANT: '/assistant',
  SETTINGS: '/settings',
  PROFILE: '/settings', // Backward compatibility alias
};

/**
 * Standardized branch names for placement openings.
 */
export const COMMON_BRANCHES = [
  'Computer Science & Engineering (CSE)',
  'Information Technology (IT)',
  'Artificial Intelligence & Machine Learning (AI&ML)',
  'Electronics & Communication Engineering (ECE)',
  'Electrical & Electronics Engineering (EEE)',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
];

/**
 * Mapping helper to tolerate and map legacy branch names/abbreviations to standard names.
 */
export const LEGACY_BRANCH_MAPPING = {
  CSE: 'Computer Science & Engineering (CSE)',
  IT: 'Information Technology (IT)',
  'AI/ML': 'Artificial Intelligence & Machine Learning (AI&ML)',
  'AI & ML': 'Artificial Intelligence & Machine Learning (AI&ML)',
  'AI&ML': 'Artificial Intelligence & Machine Learning (AI&ML)',
  ECE: 'Electronics & Communication Engineering (ECE)',
  EEE: 'Electrical & Electronics Engineering (EEE)',
  ME: 'Mechanical Engineering',
  CE: 'Civil Engineering',
  'Data Science': 'Computer Science & Engineering (CSE)',
  'Software Engineering': 'Computer Science & Engineering (CSE)',
};


