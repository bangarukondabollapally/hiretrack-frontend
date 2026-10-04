/**
 * LoginPage.jsx — TASK-009
 *
 * POST /api/auth/login per docs/API.md:
 *   Request:  { email, password }
 *   Response 200: { token, userId, email }
 *   Error 401: invalid credentials
 *
 * Design rules followed (docs/DESIGN.md):
 *   - Labels above inputs, never placeholder-as-label (§13)
 *   - Inline validation below the field, on blur and on submit (§13)
 *   - Inline spinner on submit button replaces label during loading (§12)
 *   - Specific, actionable error messages (§17)
 *   - Required fields marked with asterisk (§13)
 *
 * Auth token storage and redirect logic are added in TASK-010 (AuthContext).
 * For now, a successful login logs the response to console — this is a
 * deliberate placeholder; TASK-010 wires the real navigation.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';

import axiosInstance from '../api/axiosInstance';
import { ROUTES } from '../lib/constants';
import './Auth.css';

// ── Validation ───────────────────────────────────────────────────────────────

function validateEmail(value) {
  if (!value.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
  return '';
}

function validatePassword(value) {
  if (!value) return 'Password is required.';
  return '';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminLoginIntent = searchParams.get('role')?.toLowerCase() === 'admin';

  const { login } = useAuth();
  const [fields, setFields] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlowWaking, setIsSlowWaking] = useState(false);

  useEffect(() => {
    // Early health ping to wake up free-tier backend instance
    import('../api/axiosInstance').then(mod => mod.pingBackendHealth());
  }, []);

  // Derive inline field errors (shown only after the field has been touched)
  const errors = {
    email: validateEmail(fields.email),
    password: validatePassword(fields.password),
  };

  const hasErrors = Object.values(errors).some(Boolean);

  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    // Clear server error when the user starts correcting input
    if (serverError) setServerError('');
  }

  function handleBlur(e) {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (hasErrors) return;

    setIsSubmitting(true);
    setIsSlowWaking(false);
    setServerError('');

    const slowTimer = setTimeout(() => {
      setIsSlowWaking(true);
    }, 3000);

    try {
      const response = await axiosInstance.post('/api/auth/login', {
        email: fields.email,
        password: fields.password,
      });

      login(response.data);
      if (response.data?.role === 'ADMIN') {
        navigate('/admin/openings');
      } else {
        navigate(ROUTES.DASHBOARD);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setServerError('Incorrect email or password. Please try again.');
      } else {
        setServerError('Something went wrong. Check your connection and try again.');
      }
    } finally {
      clearTimeout(slowTimer);
      setIsSubmitting(false);
      setIsSlowWaking(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand" aria-label="HireTrack">HireTrack</div>
        <p className="auth-tagline">Stay organized. Know what's next.</p>

        <h1 className="auth-heading">{isAdminLoginIntent ? 'Placement cell sign in' : 'Sign in'}</h1>

        {isAdminLoginIntent && (
          <div className="auth-error" style={{ backgroundColor: '#EEF6F3', color: '#2A5C4B', borderColor: '#2A5C4B', marginBottom: '16px' }}>
            Sign in to publish and manage campus placement openings for your placement cell.
          </div>
        )}

        {/* Server error — per DESIGN.md §17: what happened + what to do */}
        {serverError && (
          <div className="auth-error" role="alert">
            {serverError}
          </div>
        )}

        {isSlowWaking && (
          <div className="auth-error" style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent)' }} role="alert">
            Waking up the server, the first load can take up to a minute...
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Sign in form"
        >
          {/* Email field */}
          <div className="field">
            <label className="field-label" htmlFor="login-email">
              Email <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="login-email"
              className={`field-input${touched.email && errors.email ? ' field-input--error' : ''}`}
              type="email"
              name="email"
              value={fields.email}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="email"
              aria-required="true"
              aria-describedby={touched.email && errors.email ? 'login-email-error' : undefined}
              aria-invalid={touched.email && !!errors.email}
              disabled={isSubmitting}
            />
            {touched.email && errors.email && (
              <span id="login-email-error" className="field-error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          {/* Password field */}
          <div className="field">
            <label className="field-label" htmlFor="login-password">
              Password <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="login-password"
              className={`field-input${touched.password && errors.password ? ' field-input--error' : ''}`}
              type="password"
              name="password"
              value={fields.password}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="current-password"
              aria-required="true"
              aria-describedby={touched.password && errors.password ? 'login-password-error' : undefined}
              aria-invalid={touched.password && !!errors.password}
              disabled={isSubmitting}
            />
            {touched.password && errors.password && (
              <span id="login-password-error" className="field-error" role="alert">
                {errors.password}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="auth-submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                <span>Signing in…</span>
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to={ROUTES.REGISTER}>Get started</Link>
        </p>
      </div>
    </main>
  );
}
