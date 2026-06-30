import React from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
}

function Button({
  variant = 'primary',
  disabled = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const variantClass = styles[variant];

  return (
    <button
      className={[styles.button, variantClass, className].filter(Boolean).join(' ')}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
