import { NetworkError } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export async function changePassword(
  token: string,
  payload: ChangePasswordPayload
): Promise<ChangePasswordResponse> {
  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    response = await fetch(`${API_URL}/auth/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (err) {
    if (err instanceof TypeError || (err instanceof DOMException && err.name === 'AbortError')) {
      throw new NetworkError('An unexpected error occurred. Please try again.');
    }
    throw err;
  }

  const body = await response.json();

  if (!response.ok) {
    throw { status: response.status, ...body };
  }

  return body;
}
