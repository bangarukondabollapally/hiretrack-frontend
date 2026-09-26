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

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const { login } = useAuth();
  const [fields, setFields] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // Mark all fields touched so errors become visible on submit
    setTouched({ email: true, password: true });
    if (hasErrors) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const response = await axiosInstance.post('/api/auth/login', {
        email: fields.email,
        password: fields.password,
      });

      login(response.data);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      if (err.response?.status === 401) {
        setServerError('Incorrect email or password. Please try again.');
      } else {
        setServerError('Something went wrong. Check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQuickDemoLogin() {
    setIsSubmitting(true);
    setServerError('');
    
    // Generate unique temporary email
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const tempEmail = `temp_user_${randomId}@hiretrack.demo`;
    const tempPassword = 'password123';

    try {
      // 1. Register temporary user
      try {
        await axiosInstance.post('/api/auth/register', {
          email: tempEmail,
          password: tempPassword,
        });
      } catch (regErr) {
        // Ignore 409 conflict if already registered
      }

      // 2. Log in immediately
      const response = await axiosInstance.post('/api/auth/login', {
        email: tempEmail,
        password: tempPassword,
      });

      login(response.data);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      setServerError('Failed to create instant temp mail session.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand" aria-label="HireTrack">HireTrack</div>
        <p className="auth-tagline">Stay organized. Know what's next.</p>

        <h1 className="auth-heading">Sign in</h1>

        {/* Server error — per DESIGN.md §17: what happened + what to do */}
        {serverError && (
          <div className="auth-error" role="alert">
            {serverError}
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

          {/* Quick Temp Mail Bypass */}
          <button
            type="button"
            className="auth-demo-btn"
            onClick={handleQuickDemoLogin}
            disabled={isSubmitting}
          >
            ⚡ Instant Access (Temp Mail Bypass)
          </button>
        </form>

        {/* Footer */}
        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to={ROUTES.REGISTER}>Create one</Link>
        </p>
      </div>
    </main>
  );
}
