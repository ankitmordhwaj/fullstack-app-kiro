import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, login } from './auth';
import { NetworkError } from '../types';
import type { RegisterPayload, LoginPayload, AuthResponse } from '../types';

const mockAuthResponse: AuthResponse = {
  access_token: 'access-abc',
  refresh_token: 'refresh-xyz',
  user: {
    id: 1,
    full_name: 'Alice',
    email: 'alice@example.com',
    created_at: '2024-01-01T00:00:00',
  },
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('register', () => {
  it('returns AuthResponse on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAuthResponse,
    }));

    const payload: RegisterPayload = {
      full_name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
    };

    const result = await register(payload);
    expect(result).toEqual(mockAuthResponse);
  });

  it('calls POST /auth/register with correct body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAuthResponse,
    });
    vi.stubGlobal('fetch', fetchMock);

    const payload: RegisterPayload = {
      full_name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
    };

    await register(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('throws the error body on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Email already registered' }),
    }));

    await expect(
      register({ full_name: 'A', email: 'dupe@example.com', password: 'pass1234' })
    ).rejects.toMatchObject({ error: 'Email already registered' });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(
      register({ full_name: 'A', email: 'a@b.com', password: 'pass1234' })
    ).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('login', () => {
  it('returns AuthResponse on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAuthResponse,
    }));

    const payload: LoginPayload = { email: 'alice@example.com', password: 'password123' };
    const result = await login(payload);
    expect(result).toEqual(mockAuthResponse);
  });

  it('calls POST /auth/login with correct body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAuthResponse,
    });
    vi.stubGlobal('fetch', fetchMock);

    const payload: LoginPayload = { email: 'alice@example.com', password: 'password123' };
    await login(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('throws the error body on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    }));

    await expect(
      login({ email: 'wrong@example.com', password: 'badpass' })
    ).rejects.toMatchObject({ error: 'Invalid credentials' });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(
      login({ email: 'a@b.com', password: 'pass1234' })
    ).rejects.toBeInstanceOf(NetworkError);
  });
});
