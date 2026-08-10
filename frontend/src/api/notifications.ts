import type { Notification, UnreadCountResponse } from '../types';
import { NetworkError } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export async function getNotifications(token: string): Promise<{ notifications: Notification[] }> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/notifications`, {
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

export async function getUnreadCount(token: string): Promise<UnreadCountResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/notifications/unread-count`, {
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
