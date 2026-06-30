import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { NetworkError } from '../types';
import type { RegisterPayload, FieldErrors } from '../types';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import styles from './RegisterPage.module.css';

function RegisterPage() {
  const navigate = useNavigate();

  // Field state
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Error state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>('');

  // Loading state
  const [loading, setLoading] = useState<boolean>(false);

  // Retry payload — stored so the retry button can re-submit without re-entry
  const [retryPayload, setRetryPayload] = useState<RegisterPayload | null>(null);

  const clearFieldError = (field: string): void => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateClientSide = (): boolean => {
    const errors: FieldErrors = {};
    if (!fullName.trim()) errors['full_name'] = 'Full name is required.';
    if (!email.trim()) errors['email'] = 'Email is required.';
    if (!password.trim()) errors['password'] = 'Password is required.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }
    return true;
  };

  const submitRegister = async (payload: RegisterPayload): Promise<void> => {
    setLoading(true);
    setFormError('');
    setRetryPayload(null);

    try {
      await register(payload);
      navigate('/login');
    } catch (err: unknown) {
      if (err instanceof NetworkError) {
        setFormError(err.message);
        setRetryPayload(payload);
      } else if (
        err !== null &&
        typeof err === 'object' &&
        'errors' in err &&
        typeof (err as { errors: unknown }).errors === 'object' &&
        (err as { errors: unknown }).errors !== null
      ) {
        // HTTP 400 — field-level errors
        setFieldErrors((err as { errors: FieldErrors }).errors);
      } else if (
        err !== null &&
        typeof err === 'object' &&
        'error' in err &&
        typeof (err as { error: unknown }).error === 'string'
      ) {
        // HTTP 409 or other top-level error
        setFormError((err as { error: string }).error);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validateClientSide()) return;

    const payload: RegisterPayload = {
      full_name: fullName,
      email,
      password,
    };
    await submitRegister(payload);
  };

  const handleRetry = async (): Promise<void> => {
    if (!retryPayload) return;
    await submitRegister(retryPayload);
  };

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.heading}>Create your account</h1>
        <p className={styles.subheading}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </p>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <Input
            label="Full Name"
            id="full_name"
            type="text"
            value={fullName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setFullName(e.target.value);
              clearFieldError('full_name');
            }}
            error={fieldErrors['full_name']}
            autoComplete="name"
            disabled={loading}
          />

          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value);
              clearFieldError('email');
            }}
            error={fieldErrors['email']}
            autoComplete="email"
            disabled={loading}
          />

          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPassword(e.target.value);
              clearFieldError('password');
            }}
            error={fieldErrors['password']}
            autoComplete="new-password"
            disabled={loading}
          />

          {formError && (
            <div className={styles.formError} role="alert">
              <span>{formError}</span>
              {retryPayload && (
                <button
                  type="button"
                  className={styles.retryButton}
                  onClick={handleRetry}
                  disabled={loading}
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <Button type="submit" variant="primary" disabled={loading} className={styles.submitButton}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default RegisterPage;
