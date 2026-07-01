import React from 'react';
import styles from './PasswordStrengthIndicator.module.css';

interface PasswordStrengthIndicatorProps {
  readonly password: string;
}

type StrengthLevel = 'Weak' | 'Fair' | 'Strong';

interface StrengthConfig {
  level: StrengthLevel;
  color: string;
  width: string;
}

function getStrengthScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{}|;:',.<>?/`~"]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  return score;
}

function getStrengthConfig(score: number): StrengthConfig {
  if (score >= 4) {
    return { level: 'Strong', color: '#10B981', width: '100%' };
  }
  if (score >= 2) {
    return { level: 'Fair', color: '#F59E0B', width: '66%' };
  }
  return { level: 'Weak', color: '#EF4444', width: '33%' };
}

function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) {
    return null;
  }

  const score = getStrengthScore(password);
  const { level, color, width } = getStrengthConfig(score);

  return (
    <div
      className={styles.container}
      aria-label={`Password strength: ${level}`}
      aria-live="polite"
    >
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width, backgroundColor: color }}
        />
      </div>
      <span className={styles.label} style={{ color }}>
        {level}
      </span>
    </div>
  );
}

export default PasswordStrengthIndicator;
