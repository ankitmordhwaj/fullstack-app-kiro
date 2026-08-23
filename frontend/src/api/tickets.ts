import type { Ticket, TicketPayload, TeamMemberInfo } from '../types';
import { NetworkError } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export async function getTickets(token: string): Promise<Ticket[]> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/tickets`, {
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

export async function createTicket(token: string, data: TicketPayload): Promise<Ticket> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
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

export async function updateTicket(token: string, ticketId: number, data: Partial<TicketPayload>): Promise<Ticket> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/tickets/${ticketId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
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

export async function deleteTicket(token: string, ticketId: number): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/tickets/${ticketId}`, {
      method: 'DELETE',
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
}

export async function getTeamMembers(token: string): Promise<TeamMemberInfo[]> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/tickets/members`, {
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
