import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTickets, createTicket, updateTicket, deleteTicket, getTeamMembers } from './tickets';
import { NetworkError } from '../types';
import type { Ticket, TicketPayload, TeamMemberInfo } from '../types';

const TOKEN = 'mock-token';

const mockTicket: Ticket = {
  id: 1,
  title: 'Test ticket',
  description: 'A ticket description',
  priority: 'HIGH',
  status: 'PENDING',
  team_id: 1,
  creator_id: 1,
  assignee_id: 2,
  assignee_name: 'Jane Doe',
  created_at: '2024-01-01T00:00:00',
  updated_at: '2024-01-01T00:00:00',
};

const mockPayload: TicketPayload = {
  title: 'Test ticket',
  description: 'A ticket description',
  priority: 'HIGH',
  status: 'PENDING',
  assignee_id: 2,
};

const mockTeamMember: TeamMemberInfo = {
  id: 2,
  full_name: 'Jane Doe',
  email: 'jane@example.com',
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ── getTickets ────────────────────────────────────────────────────────────────

describe('getTickets', () => {
  it('returns tickets array on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockTicket],
    }));

    const result = await getTickets(TOKEN);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockTicket);
  });

  it('sends Authorization Bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    await getTickets(TOKEN);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/tickets'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': `Bearer ${TOKEN}` }),
      })
    );
  });

  it('throws the error body on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    }));

    await expect(getTickets('bad-token')).rejects.toMatchObject({ error: 'Unauthorized' });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(getTickets(TOKEN)).rejects.toBeInstanceOf(NetworkError);
  });
});

// ── createTicket ──────────────────────────────────────────────────────────────

describe('createTicket', () => {
  it('returns the created ticket on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTicket,
    }));

    const result = await createTicket(TOKEN, mockPayload);
    expect(result).toEqual(mockTicket);
  });

  it('calls POST /tickets with correct body and headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTicket,
    });
    vi.stubGlobal('fetch', fetchMock);

    await createTicket(TOKEN, mockPayload);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/tickets'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockPayload),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`,
        }),
      })
    );
  });

  it('throws the error body on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Validation failed' }),
    }));

    await expect(createTicket(TOKEN, mockPayload)).rejects.toMatchObject({ error: 'Validation failed' });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(createTicket(TOKEN, mockPayload)).rejects.toBeInstanceOf(NetworkError);
  });
});

// ── updateTicket ──────────────────────────────────────────────────────────────

describe('updateTicket', () => {
  it('returns the updated ticket on success', async () => {
    const updated = { ...mockTicket, title: 'Updated' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => updated,
    }));

    const result = await updateTicket(TOKEN, 1, { title: 'Updated' });
    expect(result.title).toBe('Updated');
  });

  it('calls PUT /tickets/:id with correct body and headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTicket,
    });
    vi.stubGlobal('fetch', fetchMock);

    await updateTicket(TOKEN, 42, { status: 'COMPLETED' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/tickets/42'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ status: 'COMPLETED' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`,
        }),
      })
    );
  });

  it('throws the error body on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Not found' }),
    }));

    await expect(updateTicket(TOKEN, 99, { title: 'x' })).rejects.toMatchObject({ error: 'Not found' });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(updateTicket(TOKEN, 1, { title: 'x' })).rejects.toBeInstanceOf(NetworkError);
  });
});

// ── deleteTicket ──────────────────────────────────────────────────────────────

describe('deleteTicket', () => {
  it('resolves void on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'deleted' }),
    }));

    await expect(deleteTicket(TOKEN, 1)).resolves.toBeUndefined();
  });

  it('calls DELETE /tickets/:id with correct headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await deleteTicket(TOKEN, 7);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/tickets/7'),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${TOKEN}`,
        }),
      })
    );
  });

  it('throws the error body on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Forbidden' }),
    }));

    await expect(deleteTicket(TOKEN, 1)).rejects.toMatchObject({ error: 'Forbidden' });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(deleteTicket(TOKEN, 1)).rejects.toBeInstanceOf(NetworkError);
  });
});

// ── getTeamMembers ────────────────────────────────────────────────────────────

describe('getTeamMembers', () => {
  it('returns team members array on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockTeamMember],
    }));

    const result = await getTeamMembers(TOKEN);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockTeamMember);
  });

  it('calls GET /tickets/members with correct headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    await getTeamMembers(TOKEN);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/tickets/members'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${TOKEN}`,
        }),
      })
    );
  });

  it('throws the error body on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    }));

    await expect(getTeamMembers('bad-token')).rejects.toMatchObject({ error: 'Unauthorized' });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(getTeamMembers(TOKEN)).rejects.toBeInstanceOf(NetworkError);
  });
});
