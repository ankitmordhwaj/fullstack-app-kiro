import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

describe('PasswordStrengthIndicator', () => {
  it('returns null when password is empty', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "Weak" for "a" (0 criteria met)', () => {
    render(<PasswordStrengthIndicator password="a" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('shows "Weak" for "abcdefgh" (1 criterion: length only)', () => {
    render(<PasswordStrengthIndicator password="abcdefgh" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('shows "Fair" for "Abcdefgh" (2 criteria: length + uppercase)', () => {
    render(<PasswordStrengthIndicator password="Abcdefgh" />);
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('shows "Fair" for "Abcdefg1" (3 criteria: length + uppercase + digit)', () => {
    render(<PasswordStrengthIndicator password="Abcdefg1" />);
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('shows "Strong" for "Abcdefg1!" (all 4 criteria met)', () => {
    render(<PasswordStrengthIndicator password="Abcdefg1!" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('has aria-label with the strength level', () => {
    render(<PasswordStrengthIndicator password="Abcdefg1!" />);
    expect(screen.getByLabelText('Password strength: Strong')).toBeInTheDocument();
  });

  it('has aria-live="polite" for screen reader announcements', () => {
    render(<PasswordStrengthIndicator password="abc" />);
    const indicator = screen.getByLabelText('Password strength: Weak');
    expect(indicator).toHaveAttribute('aria-live', 'polite');
  });
});
