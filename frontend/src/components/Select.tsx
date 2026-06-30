import React from 'react';
import styles from './Select.module.css';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  readonly label?: string;
  readonly error?: string;
}

function Select({ label, error, id, className, children, ...rest }: Readonly<SelectProps>) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={[styles.select, error ? styles.selectError : '', className]
          .filter(Boolean)
          .join(' ')}
        aria-describedby={error ? `${selectId}-error` : undefined}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <span id={`${selectId}-error`} className={styles.errorMessage} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default Select;
