import type { TeamMembersResponse } from '../types';
import { NetworkError } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export async function getTeamMembers(token: string): Promise<TeamMembersResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/teams/members`, {
      method: 'GET',
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

export async function sendInvite(token: string, email: string): Promise<{ id: number; email: string; status: string; created_at: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/teams/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
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
