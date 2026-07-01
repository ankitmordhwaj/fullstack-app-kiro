import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { updateProfile } from '../api/profile';
import { changePassword } from '../api/password';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import { NetworkError } from '../types';
import type { Theme } from '../types';
import styles from './SettingsPage.module.css';

interface FieldErrors {
  full_name?: string;
  email?: string;
}

interface PasswordFieldErrors {
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
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

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [pwFieldErrors, setPwFieldErrors] = useState<PasswordFieldErrors>({});
  const [pwGeneralError, setPwGeneralError] = useState<string>('');
  const [pwSuccessMessage, setPwSuccessMessage] = useState<string>('');
  const [pwLoading, setPwLoading] = useState<boolean>(false);

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

  const validatePasswordForm = (): boolean => {
    const errors: PasswordFieldErrors = {};

    if (!currentPassword) {
      errors.current_password = 'Current password is required';
      setPwFieldErrors(errors);
      return false;
    }

    if (newPassword.length < 8) {
      errors.new_password = 'Password must be at least 8 characters long';
      setPwFieldErrors(errors);
      return false;
    }

    if (!/[A-Z]/.test(newPassword)) {
      errors.new_password = 'Password must contain at least one uppercase letter';
      setPwFieldErrors(errors);
      return false;
    }

    if (!/[!@#$%^&*()_+\-=[\]{}|;:',.<>?/`~"]/.test(newPassword)) {
      errors.new_password = 'Password must contain at least one special character';
      setPwFieldErrors(errors);
      return false;
    }

    if (confirmPassword !== newPassword) {
      errors.confirm_password = 'Passwords do not match';
      setPwFieldErrors(errors);
      return false;
    }

    setPwFieldErrors({});
    return true;
  };

  const handlePasswordSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setPwSuccessMessage('');
    setPwGeneralError('');

    if (!validatePasswordForm()) {
      return;
    }

    setPwLoading(true);

    try {
      await changePassword(token!, {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPwSuccessMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwFieldErrors({});
    } catch (err: unknown) {
      if (err instanceof NetworkError) {
        setPwGeneralError('An unexpected error occurred. Please try again.');
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'status' in err
      ) {
        const errorObj = err as { status: number; error?: string; errors?: Record<string, string> };

        if (errorObj.status === 401) {
          setPwFieldErrors({ current_password: 'Current password is incorrect' });
        } else if (errorObj.status === 400) {
          if (errorObj.errors) {
            const mapped: PasswordFieldErrors = {};
            if (errorObj.errors.current_password) {
              mapped.current_password = errorObj.errors.current_password;
            }
            if (errorObj.errors.new_password) {
              mapped.new_password = errorObj.errors.new_password;
            }
            if (errorObj.errors.confirm_password) {
              mapped.confirm_password = errorObj.errors.confirm_password;
            }
            setPwFieldErrors(mapped);
          } else if (errorObj.error) {
            setPwFieldErrors({ new_password: errorObj.error });
          } else {
            setPwGeneralError('An unexpected error occurred. Please try again.');
          }
        } else {
          setPwGeneralError('An unexpected error occurred. Please try again.');
        }
      } else {
        setPwGeneralError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setPwLoading(false);
    }
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

        {/* Change Password Card */}
        <section className={styles.card} aria-labelledby="password-heading">
          <div className={styles.cardContent}>
            <h2 id="password-heading" className={styles.sectionTitle}>Change Password</h2>
            <form className={styles.form} onSubmit={handlePasswordSubmit} noValidate>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="settings-current-password">
                  Current Password
                </label>
                <input
                  id="settings-current-password"
                  type="password"
                  maxLength={128}
                  className={[styles.input, pwFieldErrors.current_password ? styles.inputError : ''].join(' ').trim()}
                  value={currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setCurrentPassword(e.target.value);
                    if (pwFieldErrors.current_password) {
                      setPwFieldErrors((prev) => ({ ...prev, current_password: undefined }));
                    }
                    setPwSuccessMessage('');
                  }}
                  aria-invalid={!!pwFieldErrors.current_password}
                  aria-describedby={pwFieldErrors.current_password ? 'current-password-error' : undefined}
                />
                {pwFieldErrors.current_password && (
                  <p id="current-password-error" className={styles.fieldError} role="alert">
                    {pwFieldErrors.current_password}
                  </p>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.label} htmlFor="settings-new-password">
                  New Password
                </label>
                <input
                  id="settings-new-password"
                  type="password"
                  maxLength={128}
                  className={[styles.input, pwFieldErrors.new_password ? styles.inputError : ''].join(' ').trim()}
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setNewPassword(e.target.value);
                    if (pwFieldErrors.new_password) {
                      setPwFieldErrors((prev) => ({ ...prev, new_password: undefined }));
                    }
                    setPwSuccessMessage('');
                  }}
                  aria-invalid={!!pwFieldErrors.new_password}
                  aria-describedby={pwFieldErrors.new_password ? 'new-password-error' : undefined}
                />
                {newPassword && <PasswordStrengthIndicator password={newPassword} />}
                {pwFieldErrors.new_password && (
                  <p id="new-password-error" className={styles.fieldError} role="alert">
                    {pwFieldErrors.new_password}
                  </p>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.label} htmlFor="settings-confirm-password">
                  Confirm New Password
                </label>
                <input
                  id="settings-confirm-password"
                  type="password"
                  maxLength={128}
                  className={[styles.input, pwFieldErrors.confirm_password ? styles.inputError : ''].join(' ').trim()}
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setConfirmPassword(e.target.value);
                    if (pwFieldErrors.confirm_password) {
                      setPwFieldErrors((prev) => ({ ...prev, confirm_password: undefined }));
                    }
                    setPwSuccessMessage('');
                  }}
                  aria-invalid={!!pwFieldErrors.confirm_password}
                  aria-describedby={pwFieldErrors.confirm_password ? 'confirm-password-error' : undefined}
                />
                {pwFieldErrors.confirm_password && (
                  <p id="confirm-password-error" className={styles.fieldError} role="alert">
                    {pwFieldErrors.confirm_password}
                  </p>
                )}
              </div>

              {pwSuccessMessage && (
                <div className={styles.successMessage} role="status" aria-live="polite">
                  {pwSuccessMessage}
                </div>
              )}

              {pwGeneralError && (
                <div className={styles.errorBanner} role="alert" aria-live="assertive">
                  {pwGeneralError}
                </div>
              )}

              <button
                type="submit"
                className={styles.saveButton}
                disabled={pwLoading}
              >
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsPage;
