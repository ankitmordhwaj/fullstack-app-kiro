import React from 'react';
import styles from './Textarea.module.css';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly label?: string;
  readonly error?: string;
}

function Textarea({ label, error, id, className, ...rest }: Readonly<TextareaProps>) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={textareaId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={[styles.textarea, error ? styles.textareaError : '', className]
          .filter(Boolean)
          .join(' ')}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error && (
        <span id={`${textareaId}-error`} className={styles.errorMessage} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default Textarea;
