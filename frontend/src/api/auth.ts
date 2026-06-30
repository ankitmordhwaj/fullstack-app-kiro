import type { RegisterPayload, LoginPayload, AuthResponse } from '../types';
import { NetworkError } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new NetworkError();
    }
    throw err;
  }

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new NetworkError();
    }
    throw err;
  }

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
}
