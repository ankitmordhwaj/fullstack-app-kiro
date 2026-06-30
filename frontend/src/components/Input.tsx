import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
  readonly error?: string;
}

function Input({ label, error, id, className, ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[styles.input, error ? styles.inputError : '', className]
          .filter(Boolean)
          .join(' ')}
        aria-describedby={error ? `${inputId}-error` : undefined}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error && (
        <span id={`${inputId}-error`} className={styles.errorMessage} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default Input;
