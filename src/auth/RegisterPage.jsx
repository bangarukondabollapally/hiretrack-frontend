/**
 * RegisterPage.jsx — TASK-009
 *
 * POST /api/auth/register per docs/API.md:
 *   Request:  { email, password }  (password minimum 8 chars)
 *   Response 201: { id, email }
 *   Error 400: invalid input (missing/malformed fields)
 *   Error 409: email already registered
 *
 * Design rules followed (docs/DESIGN.md):
 *   - Labels above inputs, never placeholder-as-label (§13)
 *   - Inline validation below the field, on blur and on submit (§13)
 *   - Inline spinner on submit button replaces label during loading (§12)
 *   - Specific, actionable error messages (§17)
 *   - Required fields marked with asterisk (§13)
 *
 * On successful registration, the user is directed to login.
 * Full AuthContext integration (auto-login after register) deferred to TASK-010.
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
  if (value.length < 8) return 'Password must be at least 8 characters.';
  return '';
}

function validateConfirmPassword(value, password) {
  if (!value) return 'Please confirm your password.';
  if (value !== password) return 'Passwords do not match.';
  return '';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [fields, setFields] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = {
    email: validateEmail(fields.email),
    password: validatePassword(fields.password),
    confirmPassword: validateConfirmPassword(fields.confirmPassword, fields.password),
  };

  const hasErrors = Object.values(errors).some(Boolean);

  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    if (serverError) setServerError('');
  }

  function handleBlur(e) {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, password: true, confirmPassword: true });
    if (hasErrors) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      await axiosInstance.post('/api/auth/register', {
        email: fields.email,
        password: fields.password,
      });

      // Automatically log in after registration
      const loginRes = await axiosInstance.post('/api/auth/login', {
        email: fields.email,
        password: fields.password,
      });

      login(loginRes.data);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      if (err.response?.status === 409) {
        setServerError('An account with this email already exists. Try signing in instead.');
      } else if (err.response?.status === 400) {
        // Should not normally reach here given client-side validation, but handle gracefully
        const msg = err.response?.data?.message;
        setServerError(msg || 'Check your details and try again.');
      } else {
        setServerError('Something went wrong. Check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFillTempMail() {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const tempEmail = `temp_user_${randomId}@hiretrack.demo`;
    setFields({
      email: tempEmail,
      password: 'password123',
      confirmPassword: 'password123',
    });
    setTouched({ email: true, password: true, confirmPassword: true });
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand" aria-label="HireTrack">HireTrack</div>
        <p className="auth-tagline">Stay organized. Know what's next.</p>

        <h1 className="auth-heading">Create account</h1>

        {/* Server error */}
        {serverError && (
          <div className="auth-error" role="alert">
            {serverError}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Create account form"
        >
          {/* Email */}
          <div className="field">
            <label className="field-label" htmlFor="register-email">
              Email <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="register-email"
              className={`field-input${touched.email && errors.email ? ' field-input--error' : ''}`}
              type="email"
              name="email"
              value={fields.email}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="email"
              aria-required="true"
              aria-describedby={touched.email && errors.email ? 'register-email-error' : undefined}
              aria-invalid={touched.email && !!errors.email}
              disabled={isSubmitting}
            />
            {touched.email && errors.email && (
              <span id="register-email-error" className="field-error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="field">
            <label className="field-label" htmlFor="register-password">
              Password <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="register-password"
              className={`field-input${touched.password && errors.password ? ' field-input--error' : ''}`}
              type="password"
              name="password"
              value={fields.password}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="new-password"
              aria-required="true"
              aria-describedby={
                touched.password && errors.password
                  ? 'register-password-error'
                  : 'register-password-hint'
              }
              aria-invalid={touched.password && !!errors.password}
              disabled={isSubmitting}
            />
            {/* Helper hint — shown when field hasn't been touched yet */}
            {!touched.password && (
              <span id="register-password-hint" className="field-error" style={{ color: 'var(--text-tertiary)' }}>
                Minimum 8 characters
              </span>
            )}
            {touched.password && errors.password && (
              <span id="register-password-error" className="field-error" role="alert">
                {errors.password}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="field">
            <label className="field-label" htmlFor="register-confirm-password">
              Confirm password <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="register-confirm-password"
              className={`field-input${
                touched.confirmPassword && errors.confirmPassword ? ' field-input--error' : ''
              }`}
              type="password"
              name="confirmPassword"
              value={fields.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="new-password"
              aria-required="true"
              aria-describedby={
                touched.confirmPassword && errors.confirmPassword
                  ? 'register-confirm-error'
                  : undefined
              }
              aria-invalid={touched.confirmPassword && !!errors.confirmPassword}
              disabled={isSubmitting}
            />
            {touched.confirmPassword && errors.confirmPassword && (
              <span id="register-confirm-error" className="field-error" role="alert">
                {errors.confirmPassword}
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
                <span>Creating account…</span>
              </>
            ) : (
              'Create account'
            )}
          </button>

          {/* Auto Fill Temp Email */}
          <button
            type="button"
            className="auth-demo-btn"
            onClick={handleFillTempMail}
            disabled={isSubmitting}
          >
            🎲 Auto-Fill Temp Email
          </button>
        </form>

        {/* Footer */}
        <p className="auth-footer">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN}>Sign in</Link>
        </p>
      </div>
    </main>
  );
}
