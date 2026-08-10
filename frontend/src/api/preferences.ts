import type { AccentColor } from '../types';
import { NetworkError } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export interface PreferencesPayload {
  accent_color: AccentColor;
}

export async function updatePreferences(
  token: string,
  payload: PreferencesPayload
): Promise<{ accent_color: AccentColor }> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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
