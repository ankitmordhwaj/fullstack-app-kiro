import { NetworkError } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export async function acceptInvitation(token: string, id: number): Promise<{ id: number; status: string; team_id: number }> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/invitations/${id}/accept`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
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

export async function declineInvitation(token: string, id: number): Promise<{ id: number; status: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/invitations/${id}/decline`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
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
