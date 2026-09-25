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
  PROFILE: '/profile',
};
