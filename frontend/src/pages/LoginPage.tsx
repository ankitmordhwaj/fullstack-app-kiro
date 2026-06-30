import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginApi } from '../api/auth';
import { NetworkError } from '../types';
import type { LoginPayload } from '../types';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import styles from './LoginPage.module.css';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Field state — never cleared on API errors (Requirement 2.6)
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Form-level error state
  const [formError, setFormError] = useState<string>('');

  // Loading state
  const [loading, setLoading] = useState<boolean>(false);

  // Retry payload for NetworkError
  const [retryPayload, setRetryPayload] = useState<LoginPayload | null>(null);

  const submitLogin = async (payload: LoginPayload): Promise<void> => {
    setLoading(true);
    setFormError('');
    setRetryPayload(null);

    try {
      const response = await loginApi(payload);
      // Store tokens and user via AuthContext, then redirect to /tasks
      login(response.access_token, response.refresh_token, response.user);
      navigate('/tasks');
    } catch (err: unknown) {
      if (err instanceof NetworkError) {
        setFormError(err.message);
        setRetryPayload(payload);
      } else if (
        err !== null &&
        typeof err === 'object' &&
        'error' in err &&
        typeof (err as { error: unknown }).error === 'string'
      ) {
        // HTTP 4xx/5xx — display the API error message, do NOT clear inputs
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
    const payload: LoginPayload = { email, password };
    await submitLogin(payload);
  };

  const handleRetry = async (): Promise<void> => {
    if (!retryPayload) return;
    await submitLogin(retryPayload);
  };

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.heading}>Sign in to TaskFlow</h1>
        <p className={styles.subheading}>
          Don&apos;t have an account?{' '}
          <Link to="/register" className={styles.link}>
            Create one
          </Link>
        </p>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value);
              // Do NOT clear formError here — credentials must stay visible (Req 2.6)
            }}
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
            }}
            autoComplete="current-password"
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
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default LoginPage;
