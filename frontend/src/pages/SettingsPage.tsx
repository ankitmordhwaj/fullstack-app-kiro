import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { updateProfile } from '../api/profile';
import { NetworkError } from '../types';
import type { Theme } from '../types';
import styles from './SettingsPage.module.css';

interface FieldErrors {
  full_name?: string;
  email?: string;
}

function SettingsPage() {
  const { token, user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [fullName, setFullName] = useState<string>(user?.full_name ?? '');
  const [email, setEmail] = useState<string>(user?.email ?? '');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Sync form when user changes (e.g. after context update)
  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
    }
  }, [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    // Full name validation
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      errors.full_name = 'Full name is required.';
    } else if (trimmedName.length > 255) {
      errors.full_name = 'Full name must be 255 characters or less.';
    }

    // Email validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'Email is required.';
    } else if (trimmedEmail.length > 254) {
      errors.email = 'Email must be 254 characters or less.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSuccessMessage('');
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await updateProfile(token!, {
        full_name: fullName.trim(),
        email: email.trim(),
      });

      updateUser({
        id: result.id,
        full_name: result.full_name,
        email: result.email,
        created_at: result.created_at,
      });

      setSuccessMessage('Profile updated successfully.');
      setFieldErrors({});
    } catch (err: unknown) {
      if (err instanceof NetworkError) {
        setGeneralError(err.message);
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'errors' in err
      ) {
        // 400 validation error with field-level errors
        const serverErrors = err as { errors: { full_name?: string; email?: string } };
        setFieldErrors({
          full_name: serverErrors.errors.full_name,
          email: serverErrors.errors.email,
        });
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'error' in err
      ) {
        const errorObj = err as { error: string };
        // 409 conflict — email already registered
        if (errorObj.error === 'Email is already registered.') {
          setFieldErrors({ email: errorObj.error });
        } else {
          // 500 or other server error
          setGeneralError(errorObj.error);
        }
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (newTheme: Theme): void => {
    setTheme(newTheme);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Settings</h1>

        {/* Profile Card */}
        <section className={styles.card} aria-labelledby="profile-heading">
          <div className={styles.cardContent}>
            <h2 id="profile-heading" className={styles.sectionTitle}>Profile</h2>
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="settings-full-name">
                  Full Name
                </label>
                <input
                  id="settings-full-name"
                  type="text"
                  className={[styles.input, fieldErrors.full_name ? styles.inputError : ''].join(' ').trim()}
                  value={fullName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFullName(e.target.value);
                    if (fieldErrors.full_name) {
                      setFieldErrors((prev) => ({ ...prev, full_name: undefined }));
                    }
                    setSuccessMessage('');
                  }}
                  aria-invalid={!!fieldErrors.full_name}
                  aria-describedby={fieldErrors.full_name ? 'full-name-error' : undefined}
                />
                {fieldErrors.full_name && (
                  <p id="full-name-error" className={styles.fieldError} role="alert">
                    {fieldErrors.full_name}
                  </p>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.label} htmlFor="settings-email">
                  Email
                </label>
                <input
                  id="settings-email"
                  type="email"
                  className={[styles.input, fieldErrors.email ? styles.inputError : ''].join(' ').trim()}
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                    setSuccessMessage('');
                  }}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
                {fieldErrors.email && (
                  <p id="email-error" className={styles.fieldError} role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {successMessage && (
                <div className={styles.successMessage} role="status" aria-live="polite">
                  {successMessage}
                </div>
              )}

              {generalError && (
                <div className={styles.errorBanner} role="alert" aria-live="assertive">
                  {generalError}
                </div>
              )}

              <button
                type="submit"
                className={styles.saveButton}
                disabled={loading}
                aria-label="Save profile changes"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </section>

        {/* Appearance Card */}
        <section className={styles.card} aria-labelledby="appearance-heading">
          <div className={styles.cardContent}>
            <h2 id="appearance-heading" className={styles.sectionTitle}>Appearance</h2>
            <div
              role="radiogroup"
              aria-label="Theme"
              className={styles.themeToggle}
            >
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'light'}
                className={[styles.themeOption, theme === 'light' ? styles.themeOptionActive : ''].join(' ').trim()}
                onClick={() => handleThemeChange('light')}
                aria-label="Light theme"
              >
                Light
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'dark'}
                className={[styles.themeOption, theme === 'dark' ? styles.themeOptionActive : ''].join(' ').trim()}
                onClick={() => handleThemeChange('dark')}
                aria-label="Dark theme"
              >
                Dark
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsPage;
