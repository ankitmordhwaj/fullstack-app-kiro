import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import type { User } from '../types';

const mockUser: User = {
  id: 1,
  full_name: 'Test User',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00',
};

// Helper component that exposes auth context values via data-testid attributes
function AuthConsumer() {
  const { token, user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? 'null'}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <button
        onClick={() => login('test-access-token', 'test-refresh-token', mockUser)}
      >
        login
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('AuthContext', () => {
  describe('login', () => {
    it('sets access_token in localStorage', () => {
      renderWithRouter();
      act(() => {
        screen.getByRole('button', { name: 'login' }).click();
      });
      expect(localStorage.getItem('access_token')).toBe('test-access-token');
    });

    it('sets refresh_token in localStorage', () => {
      renderWithRouter();
      act(() => {
        screen.getByRole('button', { name: 'login' }).click();
      });
      expect(localStorage.getItem('refresh_token')).toBe('test-refresh-token');
    });

    it('updates token state', () => {
      renderWithRouter();
      act(() => {
        screen.getByRole('button', { name: 'login' }).click();
      });
      expect(screen.getByTestId('token').textContent).toBe('test-access-token');
    });

    it('updates user state', () => {
      renderWithRouter();
      act(() => {
        screen.getByRole('button', { name: 'login' }).click();
      });
      expect(screen.getByTestId('user').textContent).toBe(mockUser.email);
    });
  });

  describe('logout', () => {
    it('removes access_token from localStorage', () => {
      localStorage.setItem('access_token', 'some-token');
      renderWithRouter();
      act(() => {
        screen.getByRole('button', { name: 'logout' }).click();
      });
      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('removes refresh_token from localStorage', () => {
      localStorage.setItem('refresh_token', 'some-refresh-token');
      renderWithRouter();
      act(() => {
        screen.getByRole('button', { name: 'logout' }).click();
      });
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('clears token state', () => {
      localStorage.setItem('access_token', 'some-token');
      renderWithRouter();
      act(() => {
        screen.getByRole('button', { name: 'logout' }).click();
      });
      expect(screen.getByTestId('token').textContent).toBe('null');
    });

    it('clears user state', () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      renderWithRouter();
      act(() => {
        screen.getByRole('button', { name: 'logout' }).click();
      });
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  describe('session restore on mount', () => {
    it('reads existing access_token from localStorage', () => {
      localStorage.setItem('access_token', 'existing-token');
      renderWithRouter();
      expect(screen.getByTestId('token').textContent).toBe('existing-token');
    });

    it('reads existing user from localStorage', () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      renderWithRouter();
      expect(screen.getByTestId('user').textContent).toBe(mockUser.email);
    });
  });
});
