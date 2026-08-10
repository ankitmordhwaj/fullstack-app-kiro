import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('access_token')
  );
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  });

  const navigate = useNavigate();

  const login = (accessToken: string, refreshToken: string, loggedInUser: User): void => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    // Sync accent color preference from user profile
    if (loggedInUser.accent_color) {
      localStorage.setItem('accentColor', loggedInUser.accent_color);
    }
    setToken(accessToken);
    setUser(loggedInUser);
  };

  const logout = (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  const updateUser = (updatedUser: User): void => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
